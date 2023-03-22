module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['plugin:react/recommended', 'standard-with-typescript', 'prettier'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['tsconfig.json'],
  },
  plugins: ['react', 'prettier'],
  rules: {
    semi: 0,
    'no-console': 'off',
    '@typescript-eslint/no-unused-vars': 1,
    'prettier/prettier': [
      'error',
      {
        semi: false,
      },
    ],
    '@typescript-eslint/strict-boolean-expressions': 0,
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/no-dynamic-delete': 'warn',
    // 't@typescript-eslint/restrict-template-expressions': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}
