# ADR-0004: CI Provider Selection via CLI Templating

- Status: Accepted
- Date: 2025-10-26

## Context

Projects using this starter may be hosted on GitHub or GitLab. We want ready-to-use CI without maintaining divergent branches.

## Decision

- Provide both CI templates in the starter repository:
  - GitHub Actions: `.github/workflows/ci.yml`
  - GitLab CI: `.gitlab-ci.yml`
- The separate CLI will select and keep only the template matching the chosen VCS host (`--vcsHost=github|gitlab`) and remove the other.
- Use placeholders for Node version and package manager commands (e.g., `__NODE_VERSION__`, `__PKG_MGR__`, `__PKG_MGR_RUN__`) which the CLI will replace during scaffolding.

## Consequences

- Single source of truth for CI examples embedded in the template.
- Lean generated projects with only the relevant CI file.

## Implementation Notes

- Keep both files committed in the template repo.
- The CLI performs token replacement and deletes the non-selected CI file.
