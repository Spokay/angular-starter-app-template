# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular starter template with OIDC authentication, runtime configuration, and strict linting/formatting. It's designed to be customized via a CLI tool that replaces tokens like `__APP_NAME__`, `__OIDC_AUTHORITY__`, `__CLIENT_ID__`, etc.

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

**Important**: When the CLI scaffolds a new project, it replaces tokens in `app-config.json` with actual values. Never hardcode OIDC or API URLs in TypeScript files.

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
├── app.ts              # Root component
├── app.config.ts       # Application providers & initialization
├── app.routes.ts       # Route definitions
├── auth/
│   └── auth.config.ts  # OIDC configuration factory
├── core/
│   └── app-config.service.ts  # Runtime config loader
└── home/
    └── home.ts         # Example protected component

public/assets/
└── app-config.json     # Runtime environment configuration
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

The CLI generates either GitHub Actions (`.github/workflows/ci.yml`) or GitLab CI (`.gitlab-ci.yml`) based on the `--vcsHost` flag. Both templates run:

1. `npm install`
2. `npm run lint`
3. `npm run build`

## Architecture Decision Records

ADRs are stored in `docs/adrs/`. Key decisions:

- **ADR-001**: OIDC with `angular-auth-oidc-client` and `AutoLoginPartialRoutesGuard`
- **ADR-002**: Runtime configuration via `app-config.json`
- **ADR-003**: Linting/Formatting/Conventional Commits policy
- **ADR-004**: CI provider selection via CLI

When making significant architectural changes, create new ADRs following the MADR template.

## Token Placeholders

When using this template with the CLI, the following tokens will be replaced:

- `__APP_NAME__` - Application name (used in package.json, angular.json, tests, README)
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
4. **Token replacement**: If working with the template directly (not via CLI), manually replace all `__TOKEN__` placeholders
5. **Asset location**: Static assets go in `public/` directory (Angular 20+ convention), not `src/assets/`
