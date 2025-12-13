import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
    tseslint.configs.recommended,
    {
        files: ["**/*.{mjs,cjs,ts,mts,cts}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-parameter-properties": "off",
            "@typescript-eslint/no-use-before-define": [
                "error",
                {
                    functions: false,
                    typedefs: false,
                    classes: false,
                },
            ],
            "@typescript-eslint/explicit-function-return-type": [
                "warn",
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                },
            ],
            "@typescript-eslint/no-object-literal-type-assertion": "off",
            "@typescript-eslint/interface-name-prefix": "off",
            "@typescript-eslint/no-non-null-assertion": "off", // This is necessary for Map.has()/get()!
            "no-case-declarations": "off",
            "no-extra-boolean-cast": "off",
            "no-empty": "off",
            "no-useless-escape": "off",
            "no-fallthrough": "off",
            "indent": [
                "error",
                4,
                {
                    "SwitchCase": 1
                }
            ],
            "quotes": [
                "error",
                "double",
                {
                    "avoidEscape": true,
                    "allowTemplateLiterals": true
                }
            ],
            "no-var": "error",
            "prefer-const": "error",
            "no-trailing-spaces": "error",
        },
        languageOptions : {
            ecmaVersion: 5,
        }
    },
    {
        files: ["*.test.ts"],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off"
        },
    },
    {
        ignores: ["./build/**"],
    }
]);