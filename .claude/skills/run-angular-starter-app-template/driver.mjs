#!/usr/bin/env node
/**
 * run-angular-starter-app-template driver
 *
 * This repo is a TEMPLATE, not a runnable app: angular.json literally contains
 *   "allowedHosts": ["localhost"]__PROXY_CONFIG__
 * which is not valid JSON, so `ng serve` cannot even parse the workspace. The driver
 * therefore *materializes* a runnable copy (token replacement + a symlinked
 * node_modules) into a workspace, and runs everything there.
 *
 * It also ships a stub OIDC provider (authorize/token/userinfo/jwks, PKCE, refresh) so
 * the full login round-trip can be driven with no Keycloak, no Docker and no network,
 * plus a stub resource server so the proxy can be exercised.
 *
 * The browser is driven over the Chrome DevTools Protocol with Node 22's built-in
 * WebSocket -- no puppeteer/playwright install.
 *
 * Commands:
 *   node driver.mjs smoke        materialize + IdP + ng serve + headless login + screenshots
 *   node driver.mjs materialize  just produce the runnable copy, print its path
 *   node driver.mjs serve        materialize + IdP + ng serve, then stay up (Ctrl-C to stop)
 *   node driver.mjs build|lint|typecheck|test   run that npm script in the materialized copy
 *   node driver.mjs clean
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url));
const UNIT = path.resolve(SKILL_DIR, '../../..'); // angular-starter-app-template/
const WORKSPACE = process.env.WORKSPACE ?? path.join(os.tmpdir(), 'run-angular-starter-app-template');
const APP_DIR = path.join(WORKSPACE, 'app');
const SHOTS = path.join(WORKSPACE, 'shots');

const IDP_PORT = Number(process.env.IDP_PORT ?? 9999);
const API_PORT = Number(process.env.API_PORT ?? 8080);
const APP_PORT = Number(process.env.APP_PORT ?? 4200);
const CDP_PORT = Number(process.env.CDP_PORT ?? 9222);

const REALM = 'demo';
const AUTHORITY = `http://localhost:${IDP_PORT}/realms/${REALM}`;
const CLIENT_ID = 'angular-starter';
const APP_URL = `http://localhost:${APP_PORT}`;
const DISPLAY_NAME = 'Starter Template Dev';
const PACKAGE_NAME = 'starter-template-dev';

// ------------------------------------------------------------ materialize ---

// Same substitutions angular-starter-cli performs, inlined so this repo can be
// driven on its own. Keep in sync with angular-starter-cli/src/template/token-replacer.js.
const TOKENS = (useProxy = true) => ({
  __APP_NAME__: PACKAGE_NAME,
  __APP_DISPLAY_NAME__: DISPLAY_NAME,
  __OIDC_AUTHORITY__: AUTHORITY,
  __CLIENT_ID__: CLIENT_ID,
  __REDIRECT_URL__: APP_URL,
  __POST_LOGOUT_REDIRECT_URL__: APP_URL,
  __BACKEND_URL__: `http://localhost:${API_PORT}`,
  __SECURE_ROUTES__: useProxy ? '/api' : `http://localhost:${API_PORT}`,
  __PROXY_CONFIG__: useProxy ? ',\n            "proxyConfig": "src/proxy.conf.json"' : '',
  __REALM__: REALM,
  __NODE_VERSION__: '22',
  __PKG_MGR__: 'npm',
  __PKG_MGR_RUN__: 'npm run',
  __CLI_PACKAGE__: 'angular-starter-oidc-cli',
});

function materialize({ useProxy = true } = {}) {
  fs.rmSync(APP_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_DIR, { recursive: true });
  // tar copy: cheap, and lets us drop the heavy/irrelevant directories in one pass
  execFileSync('bash', [
    '-c',
    `tar -C ${JSON.stringify(UNIT)} --exclude=node_modules --exclude=.git --exclude=dist ` +
      `--exclude=.angular --exclude=.claude -cf - . | tar -C ${JSON.stringify(APP_DIR)} -xf -`,
  ]);

  const tokens = TOKENS(useProxy);
  const files = execFileSync('bash', [
    '-c',
    `grep -rlE '__[A-Z_]+__' ${JSON.stringify(APP_DIR)} || true`,
  ])
    .toString()
    .split('\n')
    .filter(Boolean);
  for (const f of files) {
    let c = fs.readFileSync(f, 'utf8');
    for (const [k, v] of Object.entries(tokens)) c = c.replaceAll(k, v);
    fs.writeFileSync(f, c);
  }

  // Reuse the checkout's node_modules instead of a 2-minute npm install.
  const nm = path.join(UNIT, 'node_modules');
  if (!fs.existsSync(nm)) throw new Error(`run npm install in ${UNIT} first`);
  fs.symlinkSync(nm, path.join(APP_DIR, 'node_modules'), 'dir');

  // husky's `prepare` script would fail outside a git repo; the copy has no .git.
  const pkg = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8'));
  delete pkg.scripts.prepare;
  fs.writeFileSync(path.join(APP_DIR, 'package.json'), JSON.stringify(pkg, null, 2));

  return APP_DIR;
}

// --------------------------------------------------------------- stub IdP ---

const KID = 'run-skill-key';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const b64u = (b) => Buffer.from(b).toString('base64url');
const USER = {
  sub: '11111111-2222-3333-4444-555555555555',
  preferred_username: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
};

function jwt(claims, expIn = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const head = { alg: 'RS256', typ: 'JWT', kid: KID };
  const body = { iss: AUTHORITY, aud: CLIENT_ID, azp: CLIENT_ID, iat: now, exp: now + expIn, ...claims };
  const input = `${b64u(JSON.stringify(head))}.${b64u(JSON.stringify(body))}`;
  return `${input}.${b64u(crypto.createSign('RSA-SHA256').update(input).sign(privateKey))}`;
}

const codes = new Map(); // code -> { nonce, challenge, redirect_uri }

function startIdp() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${IDP_PORT}`);
    const p = url.pathname.replace(`/realms/${REALM}`, '');
    const json = (code, body) => {
      res.writeHead(code, {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
      });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      });
      return res.end();
    }

    if (p === '/.well-known/openid-configuration')
      return json(200, {
        issuer: AUTHORITY,
        authorization_endpoint: `${AUTHORITY}/protocol/openid-connect/auth`,
        token_endpoint: `${AUTHORITY}/protocol/openid-connect/token`,
        userinfo_endpoint: `${AUTHORITY}/protocol/openid-connect/userinfo`,
        end_session_endpoint: `${AUTHORITY}/protocol/openid-connect/logout`,
        revocation_endpoint: `${AUTHORITY}/protocol/openid-connect/revoke`,
        jwks_uri: `${AUTHORITY}/protocol/openid-connect/certs`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'profile', 'email', 'roles'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
      });

    if (p === '/protocol/openid-connect/certs')
      return json(200, {
        keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, use: 'sig', alg: 'RS256' }],
      });

    // No login form: consent is implicit, so the browser bounces straight back.
    if (p === '/protocol/openid-connect/auth') {
      const q = url.searchParams;
      const code = crypto.randomUUID();
      codes.set(code, {
        nonce: q.get('nonce'),
        challenge: q.get('code_challenge'),
        redirect_uri: q.get('redirect_uri'),
      });
      const back = new URL(q.get('redirect_uri'));
      back.searchParams.set('code', code);
      back.searchParams.set('state', q.get('state') ?? '');
      back.searchParams.set('session_state', 'stub-session');
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }

    if (p === '/protocol/openid-connect/token') {
      const body = await new Promise((r) => {
        let d = '';
        req.on('data', (c) => (d += c));
        req.on('end', () => r(new URLSearchParams(d)));
      });
      const entry = codes.get(body.get('code')) ?? {};
      if (body.get('grant_type') === 'authorization_code') {
        const verifier = body.get('code_verifier');
        const expect = entry.challenge;
        const actual = verifier
          ? crypto.createHash('sha256').update(verifier).digest('base64url')
          : null;
        if (expect && expect !== actual)
          return json(400, { error: 'invalid_grant', error_description: 'PKCE mismatch' });
      }
      return json(200, {
        access_token: jwt({ ...USER, scope: 'openid profile email roles', [`${CLIENT_ID}.roles`]: ['USER'] }),
        id_token: jwt({ ...USER, nonce: entry.nonce ?? undefined, auth_time: Math.floor(Date.now() / 1000) }),
        refresh_token: jwt({ typ: 'Refresh' }, 7200),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email roles',
        session_state: 'stub-session',
      });
    }

    if (p === '/protocol/openid-connect/userinfo') return json(200, USER);
    if (p === '/protocol/openid-connect/revoke') return json(200, {});
    if (p === '/protocol/openid-connect/logout') {
      const back = url.searchParams.get('post_logout_redirect_uri') ?? APP_URL;
      res.writeHead(302, { location: back });
      return res.end();
    }
    json(404, { error: 'not_found', path: p });
  });
  return new Promise((r) => server.listen(IDP_PORT, '127.0.0.1', () => r(server)));
}

/** Stub resource server so the dev-server proxy target actually answers. */
function startApi() {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push({ url: req.url, auth: req.headers.authorization ?? null });
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(['Music 1', 'Music 2', 'Music 3']));
  });
  server.seen = seen;
  return new Promise((r) => server.listen(API_PORT, '127.0.0.1', () => r(server)));
}

// ------------------------------------------------------------- ng serve -----

function startNgServe() {
  const child = spawn('npx', ['ng', 'serve', '--port', String(APP_PORT)], {
    cwd: APP_DIR,
    env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // ng forks a build process; kill the whole group
  });
  const log = fs.createWriteStream(path.join(WORKSPACE, 'ng-serve.log'));
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  return child;
}

async function waitForHttp(url, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`timed out waiting for ${label} at ${url}`);
}

// ------------------------------------------------------------------ CDP -----

class Cdp {
  #ws;
  #id = 0;
  #pending = new Map();
  handlers = [];

  static async launch() {
    const profile = path.join(WORKSPACE, 'chrome-profile');
    fs.rmSync(profile, { recursive: true, force: true });
    const chrome = spawn(
      'google-chrome',
      [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--window-size=1280,900',
        'about:blank',
      ],
      { stdio: 'ignore', detached: true },
    );
    let target;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
        target = list.find((t) => t.type === 'page');
        if (target) break;
      } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!target) throw new Error('chrome never exposed a page target');
    const cdp = new Cdp();
    await cdp.#connect(target.webSocketDebuggerUrl);
    cdp.chrome = chrome;
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    return cdp;
  }

  #connect(url) {
    return new Promise((resolve, reject) => {
      this.#ws = new WebSocket(url);
      this.#ws.onopen = () => resolve();
      this.#ws.onerror = (e) => reject(new Error(`cdp ws error: ${e.message ?? e.type}`));
      this.#ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.#pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.#pending.get(msg.id);
          this.#pending.delete(msg.id);
          msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
        } else if (msg.method) {
          for (const h of this.handlers) h(msg);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = ++this.#id;
    this.#ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed');
    return r.result.value;
  }

  async waitFor(expression, { timeout = 30_000, label = expression } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.eval(`!!(${expression})`)) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    const url = await this.eval('location.href');
    const text = await this.eval('document.body.innerText.slice(0,400)');
    throw new Error(`timed out waiting for ${label}\n  url: ${url}\n  body: ${text}`);
  }

  async shot(name) {
    fs.mkdirSync(SHOTS, { recursive: true });
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(SHOTS, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`   screenshot -> ${file}`);
    return file;
  }

  close() {
    try { this.#ws.close(); } catch { /* closed */ }
    try { process.kill(-this.chrome.pid, 'SIGKILL'); } catch { /* gone */ }
  }
}

// ---------------------------------------------------------------- smoke -----

const results = [];
const check = (ok, name, detail = '') => {
  results.push({ ok, name });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`);
};

async function smoke() {
  fs.mkdirSync(WORKSPACE, { recursive: true });
  console.log(`materializing -> ${materialize()}`);
  const idp = await startIdp();
  const api = await startApi();
  console.log(`stub IdP      : ${AUTHORITY}`);
  console.log(`stub API      : http://localhost:${API_PORT}`);
  const ng = startNgServe();
  console.log(`ng serve      : ${APP_URL}  (log: ${WORKSPACE}/ng-serve.log)`);

  let cdp;
  const cleanup = () => {
    try { cdp?.close(); } catch { /* gone */ }
    try { process.kill(-ng.pid, 'SIGKILL'); } catch { /* gone */ }
    idp.close();
    api.close();
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  try {
    await waitForHttp(APP_URL, 180_000, 'ng serve');
    console.log('ready\n');
    cdp = await Cdp.launch();
    const consoleErrors = [];
    cdp.handlers.push((m) => {
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
        consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    });

    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`document.querySelector('app-login-page button')`, { label: 'login page' });
    check(
      (await cdp.eval('location.pathname')) === '/login',
      'unauthenticated visit to / redirects to /login',
    );
    check(
      (await cdp.eval('document.title')) === DISPLAY_NAME,
      'index.html title is the app display name',
      `"${await cdp.eval('document.title')}"`,
    );
    check(
      (await cdp.eval(`document.body.innerText.includes('Login with')`)) === true,
      'login button rendered',
    );
    await cdp.shot('01-login');

    // The whole OIDC round trip: authorize -> stub 302 -> code -> token -> userinfo -> /home
    await cdp.eval(`document.querySelector('app-login-page button').click()`);
    await cdp.waitFor(`location.pathname === '/home'`, { timeout: 45_000, label: 'redirect to /home after login' });
    await cdp.waitFor(`document.body.innerText.includes('Is Authenticated: true')`, {
      label: 'authenticated home',
    });
    check(true, 'full authorization-code + PKCE login completes');
    check(
      (await cdp.eval(`document.body.innerText.includes(${JSON.stringify(USER.preferred_username)})`)) === true,
      'userinfo claims rendered on /home',
    );
    check(
      (await cdp.eval(`document.querySelector('app-header .user-name')?.textContent?.trim()`)) === USER.name,
      'header shows the logged-in user',
    );
    const tokenStored = await cdp.eval(
      `Object.keys(sessionStorage).some(k => (sessionStorage.getItem(k)||'').includes('access_token'))`,
    );
    check(tokenStored === true, 'access token persisted in sessionStorage');
    await cdp.shot('02-home-authenticated');

    // The dev-server proxy must reach the stub resource server. Retried in-page: vite
    // occasionally refuses the first upstream connection, and a rejected fetch would
    // otherwise throw out of cdp.eval and abort the whole run instead of failing one check.
    const proxied = await cdp.eval(`(async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await fetch('/api/musics');
          return res.status;
        } catch (e) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      return 'fetch kept failing after 5 attempts';
    })()`);
    check(proxied === 200, 'dev-server proxy forwards /api to the resource server', `status ${proxied}`);
    check(
      api.seen.some((r) => r.url.startsWith('/api/musics')),
      'stub resource server saw the proxied request',
    );

    const realErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
    check(realErrors.length === 0, 'no console errors during the login flow', realErrors.slice(0, 2).join(' | '));

    consoleErrors.length = 0;
    await cdp.send('Page.navigate', { url: `${APP_URL}/nope` });
    await cdp.waitFor(`document.body.innerText.includes('404')`, { label: '404 error page' });
    await cdp.shot('03-unknown-route');
    check(true, 'unknown route renders the 404 error page');
    check(
      (await cdp.eval(`document.body.innerText.includes('Not Found')`)) === true,
      'the 404 page renders its message, not a blank <main>',
    );
  } finally {
    cleanup();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(`screenshots in ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
}

// ----------------------------------------------------------------- main -----

const cmd = process.argv[2];
switch (cmd) {
  case 'smoke':
    await smoke();
    break;
  case 'materialize':
    fs.mkdirSync(WORKSPACE, { recursive: true });
    console.log(materialize());
    break;
  case 'serve': {
    fs.mkdirSync(WORKSPACE, { recursive: true });
    materialize();
    await startIdp();
    await startApi();
    const ng = startNgServe();
    process.on('SIGINT', () => { try { process.kill(-ng.pid, 'SIGKILL'); } catch { /* gone */ } process.exit(0); });
    await waitForHttp(APP_URL, 180_000, 'ng serve');
    console.log(`app       ${APP_URL}`);
    console.log(`stub IdP  ${AUTHORITY}`);
    console.log(`stub API  http://localhost:${API_PORT}`);
    console.log(`source    ${APP_DIR}   (log: ${WORKSPACE}/ng-serve.log)`);
    break;
  }
  case 'build':
  case 'lint':
  case 'typecheck':
  case 'test': {
    fs.mkdirSync(WORKSPACE, { recursive: true });
    // Always re-materialize: reusing a stale copy silently runs these against the
    // previous checkout's code.
    materialize();
    const extra = cmd === 'test' ? ['--', '--watch=false', '--browsers=ChromeHeadless'] : [];
    const r = spawn('npm', ['run', cmd, ...extra], { cwd: APP_DIR, stdio: 'inherit' });
    r.on('exit', (code) => process.exit(code ?? 1));
    break;
  }
  case 'clean':
    fs.rmSync(WORKSPACE, { recursive: true, force: true });
    console.log(`removed ${WORKSPACE}`);
    break;
  default:
    console.log('usage: driver.mjs <smoke|materialize|serve|build|lint|typecheck|test|clean>');
    process.exit(2);
}
