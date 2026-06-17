// content.js と popup.js で共有する定数。
// content_scripts / popup いずれも classic script として同一実行コンテキストに
// 読み込まれるため、トップレベルの const は後続スクリプトから参照できる。
// （manifest.json と popup.html で constants.js を先に読み込むこと）
const APPLE_DIFF = Object.freeze({
    // content script ⇄ popup 間のメッセージアクション名
    ACTIONS: Object.freeze({
        GET_STATE: 'getState',
        SET_HIGHLIGHT: 'setHighlight',
        SET_DIFF_ONLY: 'setDiffOnly',
    }),
    // Apple 比較ページの DOM セレクタ（Apple 側の構造変更時はここを更新）
    SELECTORS: Object.freeze({
        ROW: '.compare-row',
        CELL: '.compare-column, .compare-cell',
        VISUAL: 'img, picture, video',
    }),
    // content script が付与するクラス名
    CLASSES: Object.freeze({
        HIGHLIGHT: 'apple-diff-view__highlight',
        HIDDEN: 'apple-diff-view__hidden-row',
    }),
    STYLE_ID: 'apple-diff-view-highlight-style',
    HIGHLIGHT_COLOR: 'rgba(255, 255, 0, 0.3)',
});
