import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { config as baseConfig } from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
    settings: { react: { version: 'detect' } },
  },
];
