# ADR-0003: Linting, Formatting, and Conventional Commits

- Status: Accepted
- Date: 2025-10-26

## Context

We want consistent code style, quality, and commit history across projects generated from this starter.

## Decision

- Use ESLint with Angular and RxJS plugins for static analysis.
- Use Prettier for code formatting with project-wide settings.
- Enforce Conventional Commits via commitlint and provide commitizen for guided commit messages.
- Install Husky Git hooks: `pre-commit` runs lint and format checks; `pre-push` runs typecheck and build.

## Consequences

- Contributors have a consistent workflow and style.
- CI can rely on formatting and linting being enforced locally.

## Implementation Notes

- Scripts: `lint`, `format`, `typecheck`, `commit` in `package.json`.
- Husky set up via `npm run prepare`.
- Commitizen configured under `config.commitizen` in `package.json`.
