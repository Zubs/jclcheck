// ESLint for the frontend: Vue 3 single-file components and ES modules in
// the browser. Catches likely bugs and enforces the project's formatting.
// `npm run lint -- --fix` fixes most formatting.

import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

// Formatting shared by .js files and the <script> of .vue files.
const formatting = {
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
};

export default [
    { ignores: ['dist/**'] },
    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        files: ['**/*.{js,vue}'],
        plugins: { '@stylistic': stylistic },
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: globals.browser
        },
        rules: {
            'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'prefer-const': 'error',
            'no-var': 'error',
            // Pages and components use single-word names (Editor, Landing, Footer).
            'vue/multi-word-component-names': 'off',
            ...formatting
        }
    },
    {
        files: ['**/*.js'],
        rules: {
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }]
        }
    },
    {
        // .vue files use 2 spaces; attributes on their own lines get two levels.
        files: ['**/*.vue'],
        rules: {
            'vue/script-indent': ['error', 2, { baseIndent: 0, switchCase: 1 }],
            'vue/html-indent': ['error', 2, { attribute: 2, closeBracket: 0 }],
            'vue/html-quotes': ['error', 'double'],
            'vue/mustache-interpolation-spacing': ['error', 'always'],
            'vue/no-multi-spaces': 'error'
        }
    },
    {
        files: ['vite.config.js'],
        languageOptions: {
            globals: globals.node
        }
    }
];
