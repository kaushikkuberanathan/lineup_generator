const js = require('@eslint/js');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  { ignores: ['dist/'] },
  // Default flipped to 'warn' in ESLint 9; old .eslintrc.cjs never opted into
  // this, so pinned off to preserve pre-migration behavior parity.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
        vi: 'readonly',
        __APP_VERSION__: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'no-console': 'off',
      // caughtErrors default flipped 'none' -> 'all' in ESLint 9; pinned back
      // to preserve this migration's behavior parity with the old ESLint 8 config.
      'no-unused-vars': ['warn', { caughtErrors: 'none' }],
    },
  },
];
