# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular starter template with OIDC authentication, runtime configuration, and strict linting/formatting. It uses token placeholders like `__APP_NAME__`, `__APP_DISPLAY_NAME__`, `__OIDC_AUTHORITY__`, `__CLIENT_ID__`, etc. that should be replaced with actual values when using the template.

## Development Commands

### Core Development

- `npm start` – Start dev server (default: http://localhost:4200)
- `npm run build` – Production build to `dist/`
- `npm run watch` – Build with watch mode for development
- `npm test` – Run Karma/Jasmine tests (note: tests are omitted by design in this template)

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

### Runtime Configuration Pattern

The app uses a **runtime configuration** approach where the same build can be deployed to multiple environments by swapping `public/assets/app-config.json`. This is critical to understand:

1. **AppConfigService** (`src/app/core/app-config.service.ts`) fetches `assets/app-config.json` during app initialization
2. **APP_INITIALIZER** in `app.config.ts` calls `AppConfigService.load()` before the app starts
3. **Auth configuration** (`src/app/auth/auth.config.ts`) uses `StsConfigLoader` factory to build OIDC config from the loaded values
4. The config is loaded once at startup and accessed via `AppConfigService.value`

**Important**: Token placeholders in `app-config.json` should be replaced with actual values when using this template. Never hardcode OIDC or API URLs in TypeScript files - always use the runtime configuration.

### Authentication Flow

- Uses `angular-auth-oidc-client` library (version 20.0.2)
- `AutoLoginPartialRoutesGuard` protects routes (see `app.routes.ts`)
- The library's built-in interceptor automatically attaches `Authorization: Bearer <token>` to URLs matching `secureRoutes` in the config
- `provideHttpClient(withInterceptorsFromDi())` is required in `app.config.ts` for the interceptor to work

### Path Aliases

TypeScript is configured with path aliases in `tsconfig.json`:

- `@core/*` → `src/app/core/*`
- `@shared/*` → `src/app/shared/*`

Always use these aliases for imports from core and shared modules.

### Directory Structure

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
- Ignores: `.angular/**`, `dist/**`, `**/*.spec.ts`, `public/**`

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

Tests are **intentionally omitted** in this starter template. The template includes Karma/Jasmine dependencies for future use, but no test files are provided by design. When adding tests:

- Place unit tests next to source files with `.spec.ts` extension
- ESLint ignores `**/*.spec.ts` files
- Use `npm test` to run Karma

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
- `__OIDC_AUTHORITY__` - OIDC authority URL (in app-config.json)
- `__CLIENT_ID__` - OIDC client ID (in app-config.json)
- `__REALM__` - OIDC realm name (in app-config.json)
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
