const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    // この設定ファイル自体は Node(CommonJS) 環境なので lint 対象から除外する
    { ignores: ['eslint.config.js', 'node_modules/'] },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.webextensions,
            },
        },
    },
    {
        // constants.js が定義する共有グローバルを参照する側
        files: ['content.js', 'popup.js'],
        languageOptions: {
            globals: { APPLE_DIFF: 'readonly' },
        },
    },
    {
        // constants.js は APPLE_DIFF を他スクリプト向けに「定義する」側なので未使用扱いになる
        files: ['constants.js'],
        rules: {
            'no-unused-vars': 'off',
        },
    },
];
