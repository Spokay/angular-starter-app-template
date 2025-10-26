# ADR-0002: Runtime configuration via app-config.json

- Status: Accepted
- Date: 2025-10-26

## Context

We want a single build artifact deployable to multiple environments without rebuilds. OIDC and API endpoints vary per environment.

## Decision

- Introduce `AppConfigService` that loads `public/assets/app-config.json` at app startup via `APP_INITIALIZER`.
- Build the `angular-auth-oidc-client` configuration at runtime using values from `AppConfigService`.
- Register auth using a loader-based provider by supplying `authConfig` with a custom `StsConfigLoader` that reads from `AppConfigService` and yields a `StsConfigStaticLoader`.
- Use the library’s interceptor by enabling DI-based interceptors and configuring `secureRoutes` from runtime config.

## Consequences

- Changing endpoints or scopes no longer requires rebuilding.
- Missing or invalid `app-config.json` will fail fast on startup with a clear error.
- The router and auth stack initialize after the runtime config is loaded, avoiding race conditions.

## Implementation Notes

- File: `src/app/core/app-config.service.ts`
- Provider: `provideAuthWithRuntimeConfig()` in `src/app/auth/auth.config.ts`
- Registration: `provideAuthWithRuntimeConfig()` used in `src/app/app.config.ts`
- Config file: `public/assets/app-config.json`
