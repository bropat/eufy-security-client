import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'no-case-declarations': "off",
            'no-extra-boolean-cast': "off",
            "@typescript-eslint/no-unused-vars": "off",
            "no-empty": "off",
            "no-useless-escape": "off",
            "no-fallthrough": "off",
            "@typescript-eslint/no-require-imports": "off"
        },
    },
    {
        ignores: ["./build/**"],

    },
    {
        files: ["*.test.ts"],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off"
        },
    },
]);