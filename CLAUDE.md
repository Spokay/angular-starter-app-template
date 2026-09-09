# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular starter template with OIDC authentication, runtime configuration, and strict linting/formatting. It uses token placeholders like `__APP_NAME__`, `__APP_DISPLAY_NAME__`, `__OIDC_AUTHORITY__`, `__CLIENT_ID__`, etc. that should be replaced with actual values when using the template.

## Development Commands

### Core Development

- `npm start` – Start dev server (default: http://localhost:4200)
- `npm run build` – Production build to `dist/`
- `npm run watch` – Build with watch mode for development
- `npm test` – Run Karma/Jasmine tests (watch mode); `npm run test:ci` for a single headless run
  - Component specs share `src/testing/test-providers.ts`, which supplies `provideHttpClient()`,
    `provideRouter([])` and a static `provideAuth()` config — without them the OIDC service fails
    to inject with `NG0201: No provider found for _HttpClient`.

### Code Quality

- `npm run lint` – Run ESLint on TypeScript and HTML files
- `npm run format` – Format code with Prettier
- `npm run typecheck` – Type-check without emitting files (uses `tsconfig.app.json`)

### Git Workflow

- `npm run commit` – Interactive commitizen prompt (Conventional Commits)
- Git hooks managed by Husky:
  - **pre-commit**: Runs ESLint and Prettier check
  - **pre-push**: Runs type-check and build

## Architecture

### Calling the API

`src/app/core/base.service.ts` holds the HTTP plumbing every API service shares and
**deliberately knows no URL**: it declares `protected abstract readonly baseUrl`, and each
implementation decides its own. That is what lets a service for the scaffolded resource
server and one for some third-party API be the same kind of object.

Its `get`/`post`/`put`/`patch`/`delete` are `protected` on purpose — a service exposes its
own domain API (`list()`, `save(track)`), not a raw HTTP surface for callers to assemble
paths against. `url()` joins a path onto the base tolerating a slash on either side.

`src/app/core/music.service.ts` is the worked example: `baseUrl` from
`AppConfigService.value.resourceServer.baseUrl`, wired to a button on the home page. Because
that base URL is covered by `secureRoutes`, the OIDC interceptor attaches the token with
nothing further to configure.

### Runtime Configuration Pattern

The app uses a **runtime configuration** approach where the same build can be deployed to multiple environments by swapping `public/assets/app-config.json`. This is critical to understand:

1. **AppConfigService** (`src/app/core/app-config.service.ts`) fetches `assets/app-config.json` during app initialization
2. **APP_INITIALIZER** in `app.config.ts` calls `AppConfigService.load()` before the app starts
3. **Auth configuration** (`src/app/auth/auth.config.ts`) uses `StsConfigLoader` factory to build OIDC config from the loaded values
4. The config is loaded once at startup and accessed via `AppConfigService.value`

**Important**: Token placeholders in `app-config.json` should be replaced with actual values when using this template. Never hardcode OIDC or API URLs in TypeScript files - always use the runtime configuration.

### Authentication Flow

- Uses `angular-auth-oidc-client` library (version 22.0.0)
- `AutoLoginPartialRoutesGuard` protects routes (see `app.routes.ts`)
- The library's built-in interceptor automatically attaches `Authorization: Bearer <token>` to URLs matching `secureRoutes` in the config
- It is registered functionally: `provideHttpClient(withInterceptors([authInterceptor(), errorHandlingInterceptor]))` in `app.config.ts`. Dropping `authInterceptor()` from that array silently stops every API call carrying a token — `driver.mjs smoke` asserts the header for exactly that reason.

### Error Handling and Logging

**`LoggerService`** (`src/app/shared/logger.service.ts`) is the only place this app writes to
the console — `no-console` in `eslint.config.js` enforces it, and the two exceptions carry an
inline disable saying why: the logger itself, and `src/main.ts`, whose bootstrap catch runs
before an injector exists.

Its level comes from `logging.level` in `app-config.json`, so a deployed build can be made
verbose without rebuilding. Two details are load-bearing: the level is read on **every call**,
because the logger is used from the app initializer before `AppConfigService.load()` has
resolved; and `AppConfigService` is reached through the `Injector` rather than injected,
because `AppConfigService` is what the logger reads from, and an eager dependency both ways is
a DI cycle. For the same reason `AppConfigService.initializeAuth()` *returns* whether the
session was restored instead of logging it — `app.config.ts` does that.

**`GlobalErrorHandler`** (`src/app/core/global-error-handler.ts`) is registered as Angular's
`ErrorHandler` in `app.config.ts`, so uncaught component, template, effect and subscription
errors reach the logger. Keep `provideBrowserGlobalErrorListeners()` beside it: that is what
forwards `window.onerror` and unhandled promise rejections into the same handler. It is the
place to add reporting when the project has somewhere to send failures.

**`errorHandlingInterceptor`** (`src/app/core/error-handling.interceptor.ts`) tags every
request with `X-Request-Id` — the header the scaffolded resource server reads into its logging
MDC and returns as `traceId` in every error body, which is what makes a console line and a
server log line the same request. It logs 5xx and network-`0` at error, other 4xx at warn, and
navigates **only** on 401 and 403. A 404 is logged and left alone: a failed data call must not
throw the user off the page they are on.

### Path Aliases

TypeScript is configured with path aliases in `tsconfig.json`:

- `@core/*` → `./src/app/core/*`
- `@shared/*` → `./src/app/shared/*`
- `@layout/*` → `./src/app/layout/*`
- `@components/*` → `./src/app/components/*`
- `@auth/*` → `./src/app/auth/*`

Always use these aliases for imports across module boundaries.

The targets are relative and there is no `baseUrl`: TypeScript 6 deprecates `baseUrl`
(TS5101) and removes it in 7, and without it non-relative `paths` targets are rejected
(TS5090).

### Directory Structure

```
src/app/
├── app.ts                          # Root component
├── app.config.ts                   # Application providers & initialization
├── app.routes.ts                   # Route definitions
├── auth/
│   ├── auth.config.ts              # OIDC configuration factory
│   └── user.ts                     # UserContext shape
├── core/
│   ├── app-config.service.ts       # Runtime config loader
│   ├── base.service.ts             # HTTP plumbing; implementations supply the base URL
│   ├── error-handling.interceptor.ts  # Request id, failure logging, 401/403 routing
│   ├── global-error-handler.ts     # Angular ErrorHandler -> LoggerService
│   └── music.service.ts            # Worked example of calling the resource server
├── shared/
│   └── logger.service.ts           # The app's only console writer; level from app-config
├── layout/
│   ├── header/
│   └── footer/
└── components/
    ├── home/                       # Example protected component
    ├── login-page/
    └── error-page/                 # 401/403/404 and the ** route

public/assets/
└── app-config.json                 # Runtime environment configuration
```

## Code Style & Linting

### ESLint Configuration

- Uses ESLint v9 flat config format (`eslint.config.js`)
- Configured for Angular + TypeScript + templates
- Import ordering: alphabetical, case-insensitive, with newlines between groups
- Ignores: `.angular/**`, `dist/**`, `public/**`, `.claude/**`
- Angular rules come from the `angular-eslint` meta-package. The individual
  `@angular-eslint/*` packages export only `rules`, so reading `plugin.configs[...]`
  returns undefined and silently disables every Angular rule.

### Prettier

- Configured inline in `package.json`
- Print width: 100
- Single quotes enabled
- Angular parser for HTML files

### TypeScript Strictness

- All strict mode flags enabled in `tsconfig.json`
- `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature` enforced
- Angular compiler strict options enabled: `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`

## Conventional Commits

This project enforces Conventional Commits via commitlint (configuration expected in `.husky/commit-msg` or similar). Use `npm run commit` for guided commit creation.

## Testing Strategy

Eight spec files ship with the template and must stay green. When adding tests:

- Place unit tests next to source files with `.spec.ts` extension
- `provideTestingEnvironment()` stubs `AppConfigService` with the same shape a generated
  `app-config.json` has, `logging` block included; extend that stub when you add a config key
- Spread `provideTestingEnvironment()` from `src/testing/test-providers.ts` into the
  `providers` of any spec that instantiates a component; they all reach `OidcSecurityService`.
  It also stubs `AppConfigService`, whose `value` is undefined in tests because the app
  initializer never runs — without the stub, any component reaching a service that reads the
  config fails on a property of undefined rather than on its own logic
- A spec that asserts on requests adds `provideHttpClientTesting()` **after** it, so the
  testing backend replaces the real one (see `src/app/core/music.service.spec.ts`)
- Specs are linted like the rest of the source
- Use `npm test` to run Karma (or `npm run test:ci` in CI)

## CI/CD

The template includes both GitHub Actions (`.github/workflows/ci.yml`) and GitLab CI (`.gitlab-ci.yml`) configurations. Choose one and delete the other based on your VCS provider. Both run:

1. `npm install` (or equivalent for your package manager)
2. `npm run lint`
3. `npm run build`

Remember to replace token placeholders (`__NODE_VERSION__`, `__PKG_MGR__`, `__PKG_MGR_RUN__`) with actual values.

## Architecture Decision Records

There is no `docs/adrs/` directory: the decisions that shape this template — OIDC through
`angular-auth-oidc-client` with `AutoLoginPartialRoutesGuard`, runtime configuration via
`app-config.json`, the linting and Conventional Commits policy, shipping both CI providers, and
the error/logging setup above — are documented in this file instead, beside the code they
constrain. A generated project that wants ADRs should start `docs/adrs/` with the MADR template
and record its own decisions there.

## Development Proxy Setup

The template supports optional proxy configuration for local development to avoid CORS issues.

### With Proxy (recommended for local development)

- `__PROXY_CONFIG__` → `,\n            "proxyConfig": "src/proxy.conf.json"`
- `__BACKEND_URL__` → `"http://localhost:8080"` (actual backend server)
- `__API_BASE_URL__` / `__SECURE_ROUTES__` → `"/api"` (relative path that gets proxied)
- Requests to `/api/*` are forwarded to the backend server

### Without Proxy (for production-like setup)

- `__PROXY_CONFIG__` → `` (empty string, removes proxy config)
- `__BACKEND_URL__` → `"https://api.example.com"` (full backend URL)
- `__API_BASE_URL__` / `__SECURE_ROUTES__` → `"https://api.example.com/api"` (backend URL plus context path)
- App calls backend directly (backend must handle CORS)

## Token Placeholders

When using this template with the CLI, the following tokens will be replaced:

- `__APP_NAME__` - npm package name (auto-generated from display name)
  - Used in: `package.json` (line 2), `angular.json` (lines 6, 55, 58)
  - Format: npm-friendly (lowercase, hyphens, no spaces)
  - Examples: "My Awesome App" → "my-awesome-app", "MyAwesomeApp" → "my-awesome-app"
- `__APP_DISPLAY_NAME__` - User-friendly display name
  - Used in: `src/index.html` (line 5), `src/app/app.spec.ts` (line 21), `README.md` (line 1)
  - Format: Any valid display name (spaces, capitalization, etc. allowed)
  - Usage: For human-readable contexts like documentation, page titles, and test descriptions
- `__OIDC_AUTHORITY__` - OIDC authority URL
  - Used in: `public/assets/app-config.json`
  - Format: Full OIDC authority URL (e.g., "https://idp.example.com/realms/myrealm")
- `__CLIENT_ID__` - OIDC client ID
  - Used in: `public/assets/app-config.json`
- `__REDIRECT_URL__` - OAuth redirect URL after login
  - Used in: `public/assets/app-config.json`
  - Format: Full URL where users are redirected after login (e.g., "http://localhost:4200" for dev, "https://myapp.com" for prod)
- `__POST_LOGOUT_REDIRECT_URL__` - OAuth redirect URL after logout
  - Used in: `public/assets/app-config.json`
  - Format: Full URL where users are redirected after logout
- `__BACKEND_URL__` - The resource server's **origin**
  - Used in: `src/proxy.conf.json` only — a proxy target has to be an origin
  - Format: Backend server URL (e.g., "http://localhost:8080" for dev, "https://api.myapp.com" for prod)
- `__API_BASE_URL__` - Where the app **calls** the API
  - Used in: `public/assets/app-config.json` (`resourceServer.baseUrl`)
  - Format: `/api` when the dev proxy is on; the backend URL **including its context path**
    when it is off. Omitting the context path sends every call one level above the
    controllers.
- `__SECURE_ROUTES__` - Routes that require authentication tokens
  - Used in: `public/assets/app-config.json`
  - Format: the same value as `__API_BASE_URL__` — the token is attached to exactly what the
    app calls
- `__PROXY_CONFIG__` - Development proxy configuration (conditional)
  - Used in: `angular.json`
  - Format:
    - If proxy enabled: `,\n            "proxyConfig": "src/proxy.conf.json"`
    - If proxy disabled: `` (empty string)
  - Note: When proxy is disabled, `__SECURE_ROUTES__` should match `__BACKEND_URL__` (full URL)
- `__NODE_VERSION__` - Node.js version (in CI files)
- `__PKG_MGR__` - Package manager (npm/pnpm/yarn) (in CI files)
- `__PKG_MGR_RUN__` - Package manager run command (in CI files)

### Adding a key to `app-config.json`

Three places, or generated projects silently lose it:

1. the `AppConfig` interface in `src/app/core/app-config.service.ts`
2. `public/assets/app-config.json` here
3. `generateAppConfig` in `spokay-app-starter-cli/src/config/app-config-generator.ts` — it
   rewrites the file wholesale as a post-step rather than replacing tokens in it

The CLI run skill's `driver.mjs matrix` asserts the generated file field for field, so a
forgotten third step fails there rather than in a scaffolded project weeks later.

## Common Pitfalls

1. **Don't hardcode OIDC/API URLs**: Always use `AppConfigService.value` to access runtime config
2. **secureRoutes configuration**: Ensure `secureRoutes` in `app-config.json` includes any API base URLs that need authentication tokens
3. **Import order violations**: ESLint will fail on incorrect import ordering; run `npm run lint` before committing
4. **Token replacement**: When using this template, remember to replace all `__TOKEN__` placeholders with actual values
5. **Asset location**: Static assets go in `public/` directory (Angular 20+ convention), not `src/assets/`
6. **CI file cleanup**: Delete either `.github/` or `.gitlab-ci.yml` depending on your VCS provider
7. **Don't call `console` directly**: use `LoggerService`, or the level configured in
   `app-config.json` stops meaning anything. ESLint fails the build on a bare `console` call
