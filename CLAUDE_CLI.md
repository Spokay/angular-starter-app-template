# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the CLI tool that scaffolds projects from the angular-starter-app-template.

## CLI Purpose

This CLI tool scaffolds new Angular applications from the `angular-starter-app-template` repository. It:

1. Prompts users for configuration values
2. Clones/downloads the template
3. Replaces all `__TOKEN__` placeholders with user-provided values
4. Configures the project based on user choices (VCS provider, package manager, etc.)
5. Initializes the project (npm install, git init)

## Token Replacement Requirements

### Required Tokens & Their Locations

#### 1. **`__APP_NAME__`** - Application name

- `package.json` (line 2) - 1 occurrence
- `angular.json` (lines 6, 55, 58) - 3 occurrences
- `src/app/app.spec.ts` (line 21) - 1 occurrence
- `README.md` (line 1) - 1 occurrence

**Prompt**: "What is your application name?" (e.g., "my-awesome-app")
**Usage**: Use as-is (no case conversion needed)

#### 2. **`__OIDC_AUTHORITY__`** - OIDC Authority URL

- `public/assets/app-config.json` (line 3)

**Prompt**: "What is your OIDC authority URL?" (e.g., "https://idp.example.com/realms/my-realm")
**Validation**: Must be a valid HTTPS URL

#### 3. **`__CLIENT_ID__`** - OIDC Client ID

- `public/assets/app-config.json` (line 4)

**Prompt**: "What is your OIDC client ID?" (e.g., "my-spa-client")

#### 4. **`__REALM__`** - OIDC Realm (for documentation)

- `public/assets/app-config.json` (line 3, embedded in authority URL)
- `README.md` (line 45, 70) - Example URLs only

**Note**: This token appears in example URLs. The actual authority URL comes from `__OIDC_AUTHORITY__`.

#### 5. **`__NODE_VERSION__`** - Node.js version

- `.github/workflows/ci.yml` (lines 14, 15)
- `.gitlab-ci.yml` (line 2)

**Default**: "20" (current LTS)
**Prompt**: Optional, default to LTS version

#### 6. **`__PKG_MGR__`** - Package manager

- `.github/workflows/ci.yml` (line 15)
- `.gitlab-ci.yml` (line 10, 13, 17)

**Prompt**: "Which package manager? (npm/pnpm/yarn)"
**Values**: "npm", "pnpm", or "yarn"

#### 7. **`__PKG_MGR_RUN__`** - Package manager run command

- `.github/workflows/ci.yml` (lines 16, 17, 18)
- `.gitlab-ci.yml` (lines 10, 13, 17)
- `README.md` (multiple lines for documentation)

**Values based on package manager**:

- npm → "npm run"
- pnpm → "pnpm"
- yarn → "yarn"

#### 8. **`__CLI_PACKAGE__`** - Your CLI package name (optional)

- `README.md` (lines 42, 280)

**Value**: Your published npm package name (e.g., "@your-org/angular-oidc-cli")

## CLI Workflow

### 1. User Prompts (in order)

```
1. Application name
2. OIDC authority URL
3. OIDC client ID
4. OIDC redirect URL (default: http://localhost:4200)
5. API base URL (default: http://localhost:3000)
6. VCS host (github or gitlab)
7. Package manager (npm, pnpm, or yarn)
8. Node version (default: 20)
```

### 2. Template Acquisition

- Clone from GitHub: `https://github.com/Spokay/angular-starter-app-template`
- Or download specific tag/branch
- Remove `.git` directory from template

### 3. Token Replacement

Search and replace in these files:

```javascript
const filesToReplace = [
  'package.json',
  'angular.json',
  'src/app/app.spec.ts',
  'README.md',
  'public/assets/app-config.json',
  '.github/workflows/ci.yml', // Only if VCS = github
  '.gitlab-ci.yml', // Only if VCS = gitlab
];
```

### 4. CI File Selection

- If user chose `github`: **Delete** `.gitlab-ci.yml`
- If user chose `gitlab`: **Delete** `.github/` directory
- This ensures only one CI configuration exists

### 5. Additional Configuration

#### Update `app-config.json`

Replace the entire file with user values:

```json
{
  "oidc": {
    "authority": "<user_oidc_authority>",
    "clientId": "<user_client_id>",
    "redirectUrl": "<user_redirect_url>",
    "postLogoutRedirectUri": "<user_redirect_url>",
    "scope": "openid profile email",
    "responseType": "code",
    "secureRoutes": ["<user_api_base_url>"]
  },
  "api": {
    "baseUrl": "<user_api_base_url>"
  }
}
```

### 6. Post-Scaffold Steps

Run these commands in the new project directory:

```bash
# 1. Install dependencies
<pkg_mgr> install

# 2. Initialize git (optional, ask user)
git init
git add .
git commit -m "chore: initial commit from angular-oidc-starter"

# 3. Optionally set remote (if user provides repo URL)
git remote add origin <user_repo_url>
```

### 7. Output Success Message

```
✓ Project "<app_name>" created successfully!

Next steps:
  cd <app_name>
  <pkg_mgr_run> start          # Start dev server
  <pkg_mgr_run> commit         # Make a commit (uses commitizen)

Configuration:
  - OIDC: <authority>
  - API: <api_base_url>
  - Edit public/assets/app-config.json to change runtime config

Documentation: See README.md and docs/adrs/
```

## Important Implementation Notes

### 1. Don't Include Template's package-lock.json

- The template's `package-lock.json` has `__APP_NAME__` as package name
- After token replacement, run `npm install` to generate a fresh lock file
- Or exclude it when copying the template

### 2. Preserve File Permissions

- `.husky/` hook files must be executable
- Especially: `pre-commit`, `pre-push`, `commit-msg`

### 3. Handle Existing Directories

- Check if target directory exists
- Offer to overwrite or choose new name
- Don't silently overwrite user data

### 4. Validate User Input

- **OIDC Authority**: Must be valid HTTPS URL (or HTTP for localhost)
- **Redirect URL**: Valid URL format
- **App Name**: Valid npm package name (lowercase, hyphens, no spaces)
- **Package Manager**: Must be installed on user's system

### 5. Error Handling

- If git clone fails, provide clear error message
- If npm install fails, explain it and exit gracefully
- If token replacement fails, rollback and clean up

## Testing the CLI

### Manual Test Checklist

1. Run CLI with all default options → verify build works
2. Run CLI with custom values → verify tokens replaced correctly
3. Run `npm run lint` in generated project → should pass
4. Run `npm run build` in generated project → should succeed
5. Check git hooks work: `npm run commit` → commitizen prompt appears
6. Try invalid input → CLI should reject with helpful message

### Files to Verify After Scaffolding

```bash
# Check all tokens replaced
grep -r "__.*__" <new-project> --exclude-dir=node_modules

# Should return 0 results (except in CLAUDE.md documentation)
```

## Common CLI Patterns

### Using Commander.js

```javascript
program
  .argument('<project-name>')
  .option('--oidcAuthority <url>', 'OIDC authority URL')
  .option('--oidcClientId <id>', 'OIDC client ID')
  .option('--vcsHost <github|gitlab>', 'VCS provider')
  .option('--packageManager <npm|pnpm|yarn>', 'Package manager');
// ... other options
```

### Using Inquirer.js

```javascript
const answers = await inquirer.prompt([
  {
    name: 'appName',
    message: 'Application name:',
    validate: (input) => /^[a-z0-9-]+$/.test(input),
  },
  {
    name: 'oidcAuthority',
    message: 'OIDC authority URL:',
    validate: (input) => /^https?:\/\/.+/.test(input),
  },
  // ... other prompts
]);
```

## Repository Structure Assumptions

The CLI assumes the template has this structure:

```
angular-starter-app-template/
├── .github/workflows/ci.yml
├── .gitlab-ci.yml
├── .husky/
│   ├── pre-commit
│   ├── pre-push
│   └── commit-msg
├── docs/adrs/
├── public/assets/app-config.json
├── src/
│   └── app/
│       ├── auth/
│       ├── core/
│       ├── home/
│       └── shared/
├── angular.json
├── package.json
├── README.md
└── CLAUDE.md
```

## Environment Variables (Optional)

Consider supporting these env vars for CI/automation:

```bash
ANGULAR_OIDC_AUTHORITY=https://...
ANGULAR_OIDC_CLIENT_ID=my-client
ANGULAR_VCS_HOST=github
ANGULAR_PKG_MGR=npm
```

This allows non-interactive scaffolding in CI/CD pipelines.
