// ESLint v9 flat config for Angular + TypeScript + templates, CommonJS so it loads in both
// module systems.
//
// The shared Angular configs live in the `angular-eslint` meta-package. The individual
// @angular-eslint/* plugins export only `rules`, so reaching for `plugin.configs[...]`
// yields undefined and silently disables every Angular rule.
const js = require('@eslint/js');
const angular = require('angular-eslint');
const importPlugin = require('eslint-plugin-import');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  // Caches, build outputs, vendor, public assets, and agent tooling (standalone Node
  // scripts that fail wholesale under the browser globals below).
  {
    ignores: [
      '.angular/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      'src/index.html',
      '.claude/**',
    ],
  },

  // Plain JS: config files and hooks, which run in Node.
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs', '.husky/**'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: { globals: globals.browser },
    plugins: { import: importPlugin },
    rules: {
      'import/no-unresolved': 'off', // TypeScript resolves the @core/@layout/... aliases
      'import/order': [
        'warn',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
    },
  },

  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
);
