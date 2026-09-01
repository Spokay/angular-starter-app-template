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
├── app.ts                    # Root component
├── app.config.ts             # Application providers & initialization
├── app.routes.ts             # Route definitions
├── auth/
│   └── auth.config.ts        # OIDC configuration factory
├── core/
│   ├── app-config.service.ts # Runtime config loader
│   ├── base.service.ts       # HTTP plumbing; implementations supply the base URL
│   └── music.service.ts      # Worked example of calling the resource server
└── components/
    └── home/                 # Example protected component
        ├── home.ts
        ├── home.html
        ├── home.css
        └── home.spec.ts

public/assets/
└── app-config.json           # Runtime environment configuration
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

Six spec files ship with the template and must stay green. When adding tests:

- Place unit tests next to source files with `.spec.ts` extension
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

ADRs are stored in `docs/adrs/`. Key decisions:

- **ADR-001**: OIDC with `angular-auth-oidc-client` and `AutoLoginPartialRoutesGuard`
- **ADR-002**: Runtime configuration via `app-config.json`
- **ADR-003**: Linting/Formatting/Conventional Commits policy
- **ADR-004**: CI provider selection

When making significant architectural changes, create new ADRs following the MADR template.

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

## Common Pitfalls

1. **Don't hardcode OIDC/API URLs**: Always use `AppConfigService.value` to access runtime config
2. **secureRoutes configuration**: Ensure `secureRoutes` in `app-config.json` includes any API base URLs that need authentication tokens
3. **Import order violations**: ESLint will fail on incorrect import ordering; run `npm run lint` before committing
4. **Token replacement**: When using this template, remember to replace all `__TOKEN__` placeholders with actual values
5. **Asset location**: Static assets go in `public/` directory (Angular 20+ convention), not `src/assets/`
6. **CI file cleanup**: Delete either `.github/` or `.gitlab-ci.yml` depending on your VCS provider
