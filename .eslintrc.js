module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    globals: {
        TelegramUtils: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/*.test.jsx'],
            env: {
                jest: true
            }
        }
    ]
}; 