import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/dist-*/**", "**/artifacts/**", "packages/legacy/**", "docs/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["packages/core/src/jsx-runtime.ts"],
    // TypeScript requires this type-only, module-local namespace for JSX runtimes.
    rules: { "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }] },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "max-lines": ["error", 400],
      "max-lines-per-function": ["error", { max: 49, skipBlankLines: false, skipComments: false }],
      "max-depth": ["error", 3],
    },
  },
);
