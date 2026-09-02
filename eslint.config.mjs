import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: [
      'tests/**/*.{ts,tsx}',
      'src/lib/catalog/audit.ts',
      'src/lib/catalog/client.ts',
      'src/lib/catalog/repository.ts',
      'src/features/progress/repository.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default config;
