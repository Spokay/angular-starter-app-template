# **APP_DISPLAY_NAME**

An Angular starter template with OIDC authentication, runtime configuration, and strict linting/formatting. Features opinionated OIDC auth, conventional commits, and CI/CD templates for GitHub or GitLab.

## Features

- **OIDC Authentication** via `angular-auth-oidc-client`
  - `AutoLoginPartialRoutesGuard` for protecting selected routes
  - Centralized `provideAuth` configured from runtime config
- **Runtime Configuration** (no rebuild per environment)
  - `assets/app-config.json` loaded via `APP_INITIALIZER`
  - Same build can be deployed across environments by swapping JSON file
- **HTTP Token Handling**
  - Built-in library interceptor attaches `Authorization: Bearer <token>` for configured `secureRoutes`
- **Project Hygiene & Developer Workflow**
  - ESLint (Angular + RxJS plugins) + Prettier
  - Strict TypeScript settings
  - Path aliases (`@core`, `@shared`)
  - Husky Git hooks
  - Conventional Commits (commitlint + commitizen)
- **CI/CD**
  - GitHub Actions and GitLab CI templates included
- **Documentation & Governance**
  - ADRs (Architecture Decision Records) skeleton

**Excluded on purpose:**

- E2E and unit tests (omitted by design; add later if needed)
- Dev mock server and Dockerized IdP

## Requirements

- Node.js 20+ (LTS recommended)
- Package manager: npm, pnpm, or yarn
- Angular 20+ (version specified in `package.json`)

## Getting Started

This is a template repository. To use it:

1. **Use as template** on GitHub, or clone this repository
2. **Replace all token placeholders** in the codebase:
   - `__APP_NAME__` - npm package name (lowercase-with-hyphens)
   - `__APP_DISPLAY_NAME__` - User-friendly display name
   - `__OIDC_AUTHORITY__` - Your OIDC authority URL
   - `__CLIENT_ID__` - Your OIDC client ID
   - `__REALM__` - Your OIDC realm (if applicable)
   - `__NODE_VERSION__` - Node.js version (e.g., "20")
   - `__PKG_MGR__` - Package manager ("npm", "pnpm", or "yarn")
   - `__PKG_MGR_RUN__` - Run command ("npm run", "pnpm", or "yarn")
   - `__CLI_PACKAGE__` - CLI package name (if you have one)
3. **Update `public/assets/app-config.json`** with your OIDC and API configuration
4. **Remove unused CI file**: Delete either `.github/` or `.gitlab-ci.yml` depending on your VCS provider
5. **Install dependencies**:
   ```bash
   npm install  # or pnpm install, or yarn install
   ```
6. **Start the dev server**:
   ```bash
   npm start
   ```

## Runtime Configuration

At startup, the app loads `public/assets/app-config.json`. Modify or replace this file per environment without rebuilding.

### Example Configuration

```json
{
  "oidc": {
    "authority": "https://idp.example.com/realms/my-realm",
    "clientId": "my-spa-client",
    "redirectUrl": "http://localhost:4200",
    "postLogoutRedirectUri": "http://localhost:4200",
    "scope": "openid profile email",
    "responseType": "code",
    "secureRoutes": ["http://localhost:8080", "https://api.example.com"]
  },
  "resourceServer": {
    "baseUrl": "http://localhost:8080"
  }
}
```

### How It Works

1. **`AppConfigService`** (provided at root) fetches `app-config.json` in an `APP_INITIALIZER`
2. **`auth.config.ts`** builds the `AuthModuleConfig` using values from `AppConfigService`
3. **`provideAuth(authConfig)`** is registered in `app.config.ts`

**Service excerpt:**

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
    secureRoutes?: string[];
  };
  resourceServer: { baseUrl: string };
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

**App initialization:**

```ts
// app.config.ts (excerpt)
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => () => inject(AppConfigService).load(),
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideAuth(authConfig),
  ],
};
```

## Authentication & Route Protection

- **Guard:** `AutoLoginPartialRoutesGuard` protects designated routes
- **Bootstrap:** App calls `checkAuth()` once to establish session
- **Deep linking:** The library stores the requested URL and returns there after login

**Route configuration:**

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { AutoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home, canActivate: [AutoLoginPartialRoutesGuard] },
];
```

## HTTP Token Interceptor

The built-in interceptor automatically attaches the access token to API calls hitting `secureRoutes`.

**Configuration:**

```ts
// src/app/auth/auth.config.ts
export const authConfig: PassedInitialConfig = {
  config: {
    // ... other options
    secureRoutes: ['http://localhost:8080', 'https://api.example.com'],
  },
};
```

**Enable interceptors:**

```ts
// src/app/app.config.ts
provideHttpClient(withInterceptorsFromDi());
```

## Development Scripts

```bash
npm start              # Start dev server (http://localhost:4200)
npm run build          # Production build
npm run watch          # Build with watch mode
npm test               # Run tests (Karma/Jasmine)
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run typecheck      # Type-check without emitting
npm run commit         # Interactive commit (commitizen)
```

## Code Quality

### ESLint + Prettier

- ESLint v9 flat config with Angular + RxJS plugins
- Import ordering: alphabetical, case-insensitive
- Prettier with 100-character line width, single quotes

```bash
npm run lint           # Check for issues
npm run format         # Auto-format code
```

### TypeScript Strictness

- All strict mode flags enabled
- `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`
- Angular compiler strict options: `strictTemplates`, `strictInjectionParameters`

### Path Aliases

```ts
import { AppConfigService } from '@core/app-config.service';
import { MyComponent } from '@shared/components/my-component';
```

### Conventional Commits

```bash
npm run commit         # Interactive commitizen prompt
```

### Git Hooks (Husky)

- **pre-commit:** Runs ESLint and Prettier check
- **pre-push:** Runs type-check and build

## CI/CD

The template includes both GitHub Actions and GitLab CI configurations. Choose one and delete the other.

### GitHub Actions (`.github/workflows/ci.yml`)

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
          node-version: 20
          cache: npm
      - run: npm install
      - run: npm run lint
      - run: npm run build
```

### GitLab CI (`.gitlab-ci.yml`)

```yaml
stages: [install, lint, build]
image: node:20
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
install:
  stage: install
  script:
    - npm install
lint:
  stage: lint
  script:
    - npm run lint
build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
```

**Remember:** Delete the CI configuration you don't need and update the token placeholders!

## Architecture Decision Records

Create ADRs in `docs/adrs/` using the MADR template. Suggested initial ADRs:

- **ADR-001:** OIDC with `angular-auth-oidc-client` and `AutoLoginPartialRoutesGuard`
- **ADR-002:** Runtime configuration via `app-config.json`
- **ADR-003:** Linting/Formatting/Conventional Commits policy
- **ADR-004:** CI provider selection

## Troubleshooting

**Redirect loop:**

- Verify `authority`, `clientId`, and redirect URIs in both IdP and `app-config.json`

**401s on API calls:**

- Confirm `secureRoutes` includes your API base URL
- Verify the API accepts the token audience

**CORS errors:**

- Configure your API and IdP to allow the SPA origin during development

## Project Structure

```
src/app/
├── app.ts                    # Root component
├── app.config.ts             # Application providers & initialization
├── app.routes.ts             # Route definitions
├── auth/
│   └── auth.config.ts        # OIDC configuration factory
├── core/
│   └── app-config.service.ts # Runtime config loader
└── components/
    └── home/                 # Example protected component

public/assets/
└── app-config.json           # Runtime environment configuration
```

## License

This template is provided as-is for use in your projects.
