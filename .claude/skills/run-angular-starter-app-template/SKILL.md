---
name: run-angular-starter-app-template
description: Build, run, and drive the angular-starter-app-template Angular 22 app. Use when asked to start the dev server, take a screenshot of the UI, log in through OIDC end to end, verify a UI or auth change in the real browser, or run its build / lint / typecheck / karma tests.
---

This repo is a **template, not a runnable app**: `angular.json` contains
`"allowedHosts": ["localhost"]__PROXY_CONFIG__`, which is not valid JSON, so `ng serve`
cannot even parse the workspace. The driver
(`.claude/skills/run-angular-starter-app-template/driver.mjs`) *materializes* a runnable
copy (token replacement + symlinked `node_modules`) into a workspace and runs everything
there.

It also ships a **stub OIDC provider** (discovery, JWKS, authorize, token with PKCE,
userinfo, logout) and a stub resource server, so the whole login round-trip runs headless
with no Keycloak, no Docker and no network. The browser is driven over the Chrome
DevTools Protocol using Node 22's built-in `WebSocket` — no Playwright or Puppeteer.

```bash
node .claude/skills/run-angular-starter-app-template/driver.mjs smoke
```

All paths below are relative to `angular-starter-app-template/`.

## Prerequisites

Nothing to `apt-get`. Verified in this container:

```bash
node -v                    # v24.20.0
google-chrome --version    # Google Chrome 147.0.7727.116
```

**Node 22.22.3 or 24.15 minimum.** Angular 22's engines are
`^22.22.3 || ^24.15.0 || >=26`; on anything older `npm install` succeeds and `ng build`
then refuses. The driver additionally needs Node >=22 for the global `WebSocket` it drives
Chrome with. If node resolves to an older build, source the login shell
(`nvm use 24`) or prefix `PATH` with the 24.x bin directory.

No `xvfb` needed — Chrome runs `--headless=new`.

## Setup

```bash
npm install     # in THIS repo; the materialized copy symlinks this node_modules
```

## Run (agent path)

```bash
node .claude/skills/run-angular-starter-app-template/driver.mjs smoke
```

~60s cold. Verified output:

```
materializing -> /tmp/run-angular-starter-app-template/app
stub IdP      : http://localhost:9999/realms/demo
stub API      : http://localhost:8080
ng serve      : http://localhost:4200  (log: /tmp/run-angular-starter-app-template/ng-serve.log)
ready

✓ unauthenticated visit to / redirects to /login
✓ index.html title is the app display name  "Starter Template Dev"
✓ login button rendered
   screenshot -> /tmp/run-angular-starter-app-template/shots/01-login.png
✓ full authorization-code + PKCE login completes
✓ userinfo claims rendered on /home
✓ header shows the logged-in user
✓ access token persisted in sessionStorage
   screenshot -> /tmp/run-angular-starter-app-template/shots/02-home-authenticated.png
✓ the app renders the resource server's data  Music 1,Music 2,Music 3
✓ stub resource server saw the request  /api/musics
✓ the OIDC interceptor attached the access token  Bearer eyJhbGc...
✓ no console errors during the login flow
   screenshot -> /tmp/run-angular-starter-app-template/shots/03-unknown-route.png
✓ unknown route renders the 404 error page
✓ the 404 page renders its message, not a blank <main>

13/13 checks passed
```

Screenshots land in `/tmp/run-angular-starter-app-template/shots/`; `ng serve` output in
`/tmp/run-angular-starter-app-template/ng-serve.log`.

| command | what it does |
|---|---|
| `driver.mjs smoke` | materialize + stubs + `ng serve` + headless login + 12 assertions + 3 screenshots |
| `driver.mjs serve` | same stack but stays up, for interactive poking |
| `driver.mjs materialize` | just produce the runnable copy, print its path |
| `driver.mjs build` / `lint` / `typecheck` / `test` | run that npm script inside the copy |
| `driver.mjs clean` | delete the workspace |

Env overrides: `WORKSPACE`, `APP_PORT` (4200), `IDP_PORT` (9999), `API_PORT` (8080),
`CDP_PORT` (9222).

### Poking the running app yourself

```bash
node .claude/skills/run-angular-starter-app-template/driver.mjs serve
#   app       http://localhost:4200
#   stub IdP  http://localhost:9999/realms/demo
#   stub API  http://localhost:8080
#   source    /tmp/run-angular-starter-app-template/app
```

The stub IdP has **no login form** — `/protocol/openid-connect/auth` 302s straight back
with a code, and always signs in `ada` (`Ada Lovelace`, sub
`11111111-2222-3333-4444-555555555555`, roles `["USER"]`). To change the user or its
claims, edit the `USER` constant in `driver.mjs`.

To drive a browser against it, copy the `Cdp` class out of `driver.mjs` — `Cdp.launch()`,
`cdp.eval(js)`, `cdp.waitFor(js)`, `cdp.shot(name)` are the whole API.

**Editing app code:** edit this repo, then re-run the driver — `materialize` re-copies from
the checkout each time. Editing `/tmp/run-angular-starter-app-template/app` directly works
for a quick experiment (`ng serve` hot-reloads it) but is wiped on the next run.

## Run (human path)

`npm start` fails in this repo — `ng serve` cannot parse `angular.json` with the
`__PROXY_CONFIG__` token in it. Either scaffold a real project with `angular-starter-cli`,
or use `driver.mjs serve` above.

## Test

```bash
node .claude/skills/run-angular-starter-app-template/driver.mjs typecheck   # clean
node .claude/skills/run-angular-starter-app-template/driver.mjs build       # ~7s, 385 kB initial bundle
node .claude/skills/run-angular-starter-app-template/driver.mjs lint        # clean
node .claude/skills/run-angular-starter-app-template/driver.mjs test        # 5 specs, all pass (~1s)
```

`test` adds `--watch=false --browsers=ChromeHeadless` for you. Chrome is found
automatically; `CHROME_BIN` is not needed.

## Gotchas

- **Component specs need `src/testing/test-providers.ts`.** A bare `TestBed` fails with
  `NG0201: No provider found for _HttpClient ... _OidcSecurityService -> _CheckAuthService
  -> ... -> _HttpBaseService -> _HttpClient`, because every component here reaches
  `OidcSecurityService`. Any new spec must spread `provideTestingEnvironment()` into its
  `providers`. All five specs pass (they did not before SPO-8).
- **A component that throws in a field initializer silently kills the route.** `ErrorPage`
  used to do this (`errorDetails = this.getErrorDetails(500)` evaluated before the
  `errorMap` field existed → `TypeError: Cannot read properties of undefined (reading
  '500')`); the router bailed and the URL fell back to `/` with an empty `<main>` — no
  visible error at all. Fixed in SPO-6 by lifting the map to a module-level `ERROR_MAP`
  const. If a route ever renders a blank `<main>`, check the console for a constructor
  throw before suspecting routing.
- **A deep link to `/home` triggers a full login round-trip** via
  `AutoLoginPartialRoutesGuard`, so it is slower than it looks.
- **The display name reaches the UI in three places** — `index.html`'s `<title>`, the
  header `<h1>` and the footer — all via `__APP_DISPLAY_NAME__`. The header used to be a
  hardcoded `testapp`; `app.spec.ts` asserts the token, so it survives CLI replacement.
- **`node_modules` in the materialized copy is a symlink back to this checkout.** Running
  `npm install` inside `/tmp/run-angular-starter-app-template/app` would write into *this*
  repo's `node_modules`. Don't; install here instead.
- **The copy has `scripts.prepare` deleted.** Husky's `prepare` hook fails outside a git
  repo and the workspace copy has no `.git`.
- **The driver duplicates the CLI's token table.** `TOKENS()` in `driver.mjs` mirrors
  `angular-starter-cli/src/template/token-replacer.js`. Adding a token to the template
  means updating both.
- **`ng serve` forks a build process.** Killing only the `npx` PID leaves `:4200` held; the
  driver spawns `detached: true` and kills the process group.
- **`pkill -f "driver.mjs serve"` kills the calling shell**, because the Bash tool's own
  `bash -c` command line contains that string (exit code 144, no output). Kill by PID from
  `ss -ltnp | grep 4200` instead.
- **The `@angular-eslint/*` plugin packages export no `configs`.** Only `rules`. The flat
  configs live in the `angular-eslint` meta-package, so a config that reads
  `plugin.configs['flat/recommended']` gets `undefined` and silently lints nothing
  Angular-specific — `npm run lint` still passes, which is the trap.
- **Components rely on OnPush.** Angular 22's `ng update` inserts
  `changeDetection: ChangeDetectionStrategy.Eager` everywhere to preserve v21 behaviour;
  those shims were removed after verifying the app renders correctly without them. Bind
  state through the `async` pipe — writing to a field from a manual `.subscribe()` does not
  mark an OnPush component dirty, so the view updates only when some other binding happens
  to trigger a check.
- **Auth state lives in `sessionStorage`**, so every fresh Chrome profile starts logged
  out — which is what makes the smoke run repeatable.

## Troubleshooting

- **`timed out waiting for <expr>`**: the driver prints the current URL and the first 400
  chars of `document.body.innerText` with the error — read those first. If the body is
  empty, check `/tmp/run-angular-starter-app-template/ng-serve.log` for a compile error.
- **`run npm install in <repo> first`**: `materialize` needs this checkout's `node_modules`
  to symlink.
- **`chrome never exposed a page target`**: a previous Chrome still owns `CDP_PORT`.
  `ss -ltnp | grep 9222`, kill that PID, or set `CDP_PORT=9223`.
- **`timed out waiting for ng serve`**: usually port 4200 is already taken by an earlier
  `serve`. Kill it by PID, or use `APP_PORT=4300`.
- **Driver dies at the timeout with no output**: Node buffers stdout when piped and loses
  it on SIGTERM. Redirect to a file rather than piping to `tail` when debugging.
