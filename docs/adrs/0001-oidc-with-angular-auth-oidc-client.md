# ADR-001: OIDC with angular-auth-oidc-client and AutoLoginPartialRoutesGuard

- Status: Accepted
- Date: 2025-10-26

## Context

We need reliable OpenID Connect (OIDC) authentication for SPA projects with minimal custom code and good defaults.

## Decision

Use `angular-auth-oidc-client` to manage OIDC flows. Protect selected routes with `AutoLoginPartialRoutesGuard`. Use the library’s built-in HTTP interceptor with `secureRoutes` to attach tokens.

## Consequences

- Faster integration and fewer custom bugs.
- Behavior and updates follow the library lifecycle.
- For advanced behaviors (special 401 handling, conditional token attach), we may add a custom interceptor later.
