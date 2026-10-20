// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLAUDE.md §6: no `any` without a comment explaining why (use an eslint-disable comment with a reason).
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['dist/*', '.expo/*'],
  },
]);
