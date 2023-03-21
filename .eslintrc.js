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
    '@typescript-eslint/strict-boolean-expressions': 2,
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/prefer-optional-chain': 1,
    '@typescript-eslint/no-dynamic-delete': 1,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}
