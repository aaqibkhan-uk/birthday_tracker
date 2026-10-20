import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  { ignores: ['node_modules/', '.vercel/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // CLAUDE.md §6: no `any` without a comment explaining why (use an eslint-disable comment with a reason).
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  prettier,
]);
