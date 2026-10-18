// ESLint for the backend: Node, CommonJS. Catches likely bugs and enforces
// the project's formatting. `npm run lint -- --fix` fixes most formatting.

const js = require('@eslint/js');
const stylistic = require('@stylistic/eslint-plugin');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        plugins: { '@stylistic': stylistic },
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: globals.node
        },
        rules: {
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'prefer-const': 'error',
            'no-var': 'error',

            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
            '@stylistic/semi': ['error', 'always'],
            '@stylistic/comma-dangle': ['error', 'never'],
            '@stylistic/brace-style': ['error', '1tbs'],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@stylistic/comma-spacing': 'error',
            '@stylistic/key-spacing': 'error',
            '@stylistic/keyword-spacing': 'error',
            '@stylistic/space-before-blocks': 'error',
            '@stylistic/space-infix-ops': 'error',
            '@stylistic/arrow-spacing': 'error',
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-multi-spaces': 'error',
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
            '@stylistic/eol-last': 'error',
            // A blank line after a closing brace, except before the next `case`.
            '@stylistic/padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: 'block-like', next: '*' },
                { blankLine: 'any', prev: 'block-like', next: ['case', 'default'] }
            ]
        }
    }
];
