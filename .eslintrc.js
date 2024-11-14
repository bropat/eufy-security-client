module.exports = {
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    parserOptions: {
        ecmaVersion: "latest", // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        project: "./tsconfig.json",
    },
    extends: [
        "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    ],
    plugins: [],
    rules: {
        "indent": "off",
        "@typescript-eslint/indent": [
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
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-use-before-define": [
            "error",
            {
                functions: false,
                typedefs: false,
                classes: false,
            },
        ],
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                ignoreRestSiblings: true,
                argsIgnorePattern: "^_",
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
        "no-var": "error",
        "prefer-const": "error",
        "no-trailing-spaces": "error",
    },
    overrides: [
        {
            files: ["*.test.ts"],
            rules: {
                "@typescript-eslint/explicit-function-return-type": "off",
            },
        },
    ],
};