import { config as baseConfig } from '@repo/eslint-config/base';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ['apps/**', 'packages/*/dist/**'],
  },
  {
    files: ['**/*.config.js', '**/jest.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
];
