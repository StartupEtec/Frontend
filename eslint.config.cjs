const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

module.exports = [
  {
    ignores: ["node_modules", "dist", "coverage", ".expo", "web-build", "__mocks__"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
