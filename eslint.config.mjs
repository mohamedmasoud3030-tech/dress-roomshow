import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src-tauri/target/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {},
  },
];
