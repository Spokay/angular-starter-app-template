# **APP_NAME** – Angular OIDC Starter

A production‑minded Angular starter with opinionated OIDC auth, strict linting/formatting, conventional commits, and ready‑to‑use CI for GitHub or GitLab. Runtime configuration allows the same build to be deployed across environments by swapping a JSON file.

## Features

- OIDC auth via `angular-auth-oidc-client`
  - `AutoLoginPartialRoutesGuard` for protecting selected routes
  - Centralized `provideAuth` configured from runtime config
- Runtime configuration (no rebuild per environment)
  - `assets/app-config.json` loaded via `APP_INITIALIZER`
- HTTP token handling
  - Built‑in library interceptor attaches `Authorization: Bearer <token>` for configured `secureRoutes`
- Project hygiene & developer workflow
  - ESLint (Angular + RxJS plugins) + Prettier
  - Strict TypeScript settings
  - Path aliases (e.g., `@core`, `@shared`)
  - Husky Git hooks
  - Conventional Commits (commitlint + commitizen)
- CI/CD
  - GitHub Actions and GitLab CI templates; the CLI selects one per your VCS host
- Documentation & governance
  - Comprehensive README (this file)
  - ADRs (Architecture Decision Records) skeleton

Excluded on purpose

- E2E and unit tests (omitted by design here; add later if needed)
- Dev mock server and Dockerized IdP (Keycloak) — not included by default

## Requirements

- Node: **NODE_VERSION** (LTS recommended)
- Package manager: **PKG_MGR** (npm/pnpm/yarn)
- Angular: version specified in `package.json`

## Quick start

Using the CLI (recommended):

```bash
npx __CLI_PACKAGE__@latest my-app \
  --vcsHost github \
  --packageManager __PKG_MGR__ \
  --oidcAuthority https://idp.example.com/realms/__REALM__ \
  --oidcClientId __CLIENT_ID__ \
  --oidcRedirectUrl http://localhost:4200 \
  --apiBaseUrl http://localhost:3000
cd my-app
__PKG_MGR_RUN__ install
__PKG_MGR_RUN__ start
```

Manual (without CLI):

1. Clone this repo (or download a tarball at a tag).
2. Replace tokens in files (search for `__APP_NAME__`, `__OIDC_AUTHORITY__`, etc.).
3. Update `assets/app-config.json`.
4. Install dependencies and start the dev server.

## Runtime configuration

At startup, the app loads `/assets/app-config.json`. Modify or replace this file per environment without rebuilding.

Example `assets/app-config.json`:

```json
{
  "oidc": {
    "authority": "https://idp.example.com/realms/__REALM__",
    "clientId": "__CLIENT_ID__",
    "redirectUrl": "http://localhost:4200",
    "postLogoutRedirectUri": "http://localhost:4200",
    "scope": "openid profile email",
    "responseType": "code"
  },
  "api": {
    "baseUrl": "http://localhost:3000"
  }
}
```

### How it’s wired

- `AppConfigService` (provided at root) fetches `app-config.json` in an `APP_INITIALIZER`.
- `auth.config.ts` builds the `AuthModuleConfig` using values from `AppConfigService`.
- `provideAuth(authConfig)` is registered in `app.config.ts`.

A minimal initializer pattern (excerpt):

```ts
// app-config.service.ts
import { Injectable } from '@angular/core';

export interface AppConfig {
  oidc: {
    authority: string;
    clientId: string;
    redirectUrl: string;
    postLogoutRedirectUri?: string;
    scope?: string;
    responseType?: 'code' | string;
  };
  api: { baseUrl: string };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config!: AppConfig;
  get value(): AppConfig {
    return this.config;
  }
  async load(): Promise<void> {
    const res = await fetch('assets/app-config.json');
    this.config = await res.json();
  }
}
```

```ts
// app.config.ts (excerpt)
import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';
import { authConfig } from './auth/auth.config';
import { AppConfigService } from './core/app-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => () => inject(AppConfigService).load(),
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideAuthWithRuntimeConfig(),
  ],
};
```

## Auth and route protection

- Guard: `AutoLoginPartialRoutesGuard` protects designated routes.
- App bootstrap calls `checkAuth()` once to establish session.
- The library stores the requested URL and returns there after login.

In `app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AutoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home, canActivate: [AutoLoginPartialRoutesGuard] },
];
```

## HTTP token interceptor (built‑in)

Attach the access token automatically to API calls hitting `secureRoutes`.

```ts
// src/app/auth/auth.config.ts
export const authConfig: PassedInitialConfig = {
  config: {
    // ... other options
    secureRoutes: ['http://localhost:3000', 'https://api.example.com'],
  },
};
```

Enable DI interceptors:

```ts
// src/app/app.config.ts
provideHttpClient(withInterceptorsFromDi());
```

## Code quality & workflow

- ESLint + Prettier configured; run:

```bash
__PKG_MGR_RUN__ lint
__PKG_MGR_RUN__ format
```

- Strict TypeScript: `tsconfig.json` enables stricter checks for safer code.
- Path aliases: `@core` and `@shared` help keep imports tidy.
- Conventional Commits with commitizen:

```bash
__PKG_MGR_RUN__ commit
```

- Husky hooks
  - pre-commit: lint + format check
  - pre-push: type-check + build (tests omitted by design)

## CI/CD

The CLI scaffolds either GitHub Actions or GitLab CI depending on `--vcsHost`.

GitHub Actions example `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: __NODE_VERSION__
          cache: __PKG_MGR__
      - run: __PKG_MGR_RUN__ install
      - run: __PKG_MGR_RUN__ lint
      - run: __PKG_MGR_RUN__ build
```

GitLab CI example `.gitlab-ci.yml`:

```yaml
stages: [install, lint, build]
image: node:__NODE_VERSION__
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
install:
  stage: install
  script:
    - __PKG_MGR_RUN__ install
lint:
  stage: lint
  script:
    - __PKG_MGR_RUN__ lint
build:
  stage: build
  script:
    - __PKG_MGR_RUN__ build
  artifacts:
    paths:
      - dist/
```

## Scripts

Common scripts the starter exposes:

- `start` – dev server
- `build` – production build
- `lint` – ESLint
- `format` – Prettier write
- `commit` – commitizen prompt (Conventional Commits)
- `prepare` – Husky install (runs automatically post‑install)

## ADRs (Architecture Decision Records)

- Create ADRs in `docs/adrs/` using the “MADR” template.
- Suggested initial ADRs:
  - ADR-001: OIDC with `angular-auth-oidc-client` and AutoLoginPartialRoutesGuard
  - ADR-002: Runtime configuration via `app-config.json`
  - ADR-003: Linting/Formatting/Conventional Commits policy
  - ADR-004: CI provider selection via CLI

## CLI (separate repository)

- Package name: `__CLI_PACKAGE__`
- Usage: `npx __CLI_PACKAGE__@latest <projectName> [options]`
- Key options:
  - `--vcsHost` = `github` | `gitlab`
  - `--packageManager` = `npm` | `pnpm` | `yarn`
  - `--oidcAuthority` = OIDC issuer/authority URL
  - `--oidcClientId` = OIDC client ID
  - `--oidcRedirectUrl` = SPA redirect URL
  - `--apiBaseUrl` = default API base URL
- The CLI will:
  1. Fetch this starter at a tag/branch
  2. Replace tokens in files
  3. Generate `assets/app-config.json`
  4. Initialize Git and install dependencies (optional)
  5. Scaffold CI for your VCS host

## Troubleshooting

- Redirect loop: verify `authority`, `clientId`, and redirect URIs in both IdP and `app-config.json`.
- 401s on API calls: confirm `secureRoutes` includes your API base URL and that the API accepts the token audience.
- CORS: configure your API and IdP to allow the SPA origin during development.
