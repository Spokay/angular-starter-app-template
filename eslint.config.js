// ESLint v9 flat config for Angular + TypeScript + Templates
// CommonJS format compatible with Node ESM/CJS projects.

const js = require('@eslint/js');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const importPlugin = require('eslint-plugin-import');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

const angularFlatRecommended =
  angular && angular.configs ? angular.configs['flat/recommended'] : null;
const templateFlatRecommended =
  angularTemplate && angularTemplate.configs ? angularTemplate.configs['flat/recommended'] : null;

const configs = [
  // Ignore caches, build outputs, vendor, public assets, and test specs (not used)
  {
    ignores: [
      '.angular/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      'src/index.html',
      '**/*.spec.ts',
    ],
  },

  // Base JS recommendations (apply to JS files only)
  {
    ...js.configs.recommended,
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
  },

  // Node globals for config and scripts
  {
    files: ['eslint.config.js', '.husky/**'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-undef': 'off',
    },
  },
];

if (angularFlatRecommended) configs.push(angularFlatRecommended);
if (templateFlatRecommended) configs.push(templateFlatRecommended);

// TypeScript rules (non type-aware to keep fast and simple)
configs.push({
  files: ['**/*.ts'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    globals: globals.browser,
  },
  plugins: {
    import: importPlugin,
  },
  rules: {
    // TS uses type system; avoid core no-undef on TS files
    'no-undef': 'off',
    // Keep previous customizations
    'import/no-unresolved': 'off',
    'import/order': [
      'warn',
      {
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      },
    ],
  },
});

// Angular template rules only for component templates
configs.push({
  files: ['src/app/**/*.html'],
  languageOptions: {
    // Ensure Angular template parser is used for HTML files
    parser: require('@angular-eslint/template-parser'),
  },
});

module.exports = configs;
