import { FlatCompat } from '@eslint/eslintrc';

import { config as reactInternalConfig } from './react-internal.js';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** @type {import("eslint").Linter.Config[]} */
export const config = [...reactInternalConfig, ...compat.extends('next/core-web-vitals')];
