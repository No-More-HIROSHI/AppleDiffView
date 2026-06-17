// 共有定数 (APPLE_DIFF) は constants.js で定義され、manifest の content_scripts で
// constants.js → content.js の順に読み込まれる。
const { ACTIONS, SELECTORS, CLASSES, STYLE_ID, HIGHLIGHT_COLOR } = APPLE_DIFF;

const MISSING_ROW_RETRY_DELAY_MS = 100;
const MISSING_ROW_WARNING_MESSAGE = "セレクタにマッチする行が見つかりませんでした。\nHTML構造を確認してください。またはクラス名が変更されていないかご確認ください。";

let mutationObserver = null;
let isDiffCheckScheduled = false;
let hasLoggedMissingRows = false;
let hasSeenCompareRows = false;
let missingRowWarningTimer = null;

let isHighlightEnabled = true;
let isDiffOnlyMode = false;
let diffCount = 0;

const ensureHighlightStyle = () => {
    if (document.getElementById(STYLE_ID)) {
        return;
    }

    const head = document.head || document.querySelector('head');
    if (!head) {
        console.warn('head 要素が見つからないため、ハイライト用スタイルを挿入できません。');
        return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
        `.${CLASSES.HIGHLIGHT} { background-color: ${HIGHLIGHT_COLOR} !important; }`,
        `.${CLASSES.HIDDEN} { display: none !important; }`,
    ].join('\n');
    head.appendChild(style);
};

// 1 行を分類する純粋関数。DOM は変更しない。
//   'ignore' : 比較セルが 1 つ以下 → 対象外
//   'visual' : 画像・空テキストのヘッダー行 → 常に表示
//   'diff'   : テキストに差分あり → ハイライト対象
//   'same'   : テキストが同一 → 差分のみ表示モードで非表示候補
const classifyRow = (row) => {
    const cells = Array.from(row.querySelectorAll(SELECTORS.CELL));

    if (cells.length <= 1) {
        return 'ignore';
    }

    const values = cells.map(cell => cell.textContent.trim());
    const allEmpty = values.every(value => value === '');
    const hasVisualContent = cells.some(cell => cell.querySelector(SELECTORS.VISUAL));

    if (allEmpty || hasVisualContent) {
        return 'visual';
    }

    return values.some(value => value !== values[0]) ? 'diff' : 'same';
};

const highlightComparisonDifferences = () => {
    ensureHighlightStyle();

    const rows = document.querySelectorAll(SELECTORS.ROW);

    if (rows.length === 0) {
        scheduleMissingRowWarning();
        return;
    }

    cancelMissingRowWarning();
    hasSeenCompareRows = true;
    hasLoggedMissingRows = false;

    let count = 0;

    rows.forEach((row) => {
        const category = classifyRow(row);

        switch (category) {
            case 'diff':
                count++;
                row.classList.toggle(CLASSES.HIGHLIGHT, isHighlightEnabled);
                row.classList.remove(CLASSES.HIDDEN);
                break;

            case 'same':
                row.classList.remove(CLASSES.HIGHLIGHT);
                row.classList.toggle(CLASSES.HIDDEN, isHighlightEnabled && isDiffOnlyMode);
                break;

            default: // 'visual' / 'ignore' → 常に表示
                row.classList.remove(CLASSES.HIGHLIGHT);
                row.classList.remove(CLASSES.HIDDEN);
        }
    });

    diffCount = count;
};

// 行が見つからない場合の警告。ページ描画が間に合っていないだけのことがあるため、
// 一度だけ猶予を置いて再確認し、それでも無ければ 1 度だけ警告する。
// 行が遅れて出現した場合の再描画は MutationObserver に任せる。
const scheduleMissingRowWarning = () => {
    if (hasSeenCompareRows || hasLoggedMissingRows || missingRowWarningTimer) {
        return;
    }

    missingRowWarningTimer = setTimeout(() => {
        missingRowWarningTimer = null;

        if (hasSeenCompareRows || document.querySelector(SELECTORS.ROW)) {
            return;
        }

        console.warn(MISSING_ROW_WARNING_MESSAGE);
        hasLoggedMissingRows = true;
    }, MISSING_ROW_RETRY_DELAY_MS);
};

const cancelMissingRowWarning = () => {
    if (missingRowWarningTimer) {
        clearTimeout(missingRowWarningTimer);
        missingRowWarningTimer = null;
    }
};

const scheduleHighlightDifferences = () => {
    if (isDiffCheckScheduled) {
        return;
    }

    isDiffCheckScheduled = true;

    requestAnimationFrame(() => {
        isDiffCheckScheduled = false;
        highlightComparisonDifferences();
    });
};

const findCompareRowFromNode = (node) => {
    if (!node) {
        return null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        return node.closest(SELECTORS.ROW);
    }

    return node.parentElement?.closest(SELECTORS.ROW) ?? null;
};

const nodeContainsCompareRow = (node) => {
    if (!node) {
        return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        return node.matches(SELECTORS.ROW) || Boolean(node.querySelector(SELECTORS.ROW));
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        return Array.from(node.childNodes).some(child => nodeContainsCompareRow(child));
    }

    return false;
};

const handleMutations = (mutationsList) => {
    const hasRelevantMutation = mutationsList.some((mutation) => {
        if (findCompareRowFromNode(mutation.target)) {
            return true;
        }

        return Array.from(mutation.addedNodes).some(nodeContainsCompareRow)
            || Array.from(mutation.removedNodes).some(nodeContainsCompareRow);
    });

    if (hasRelevantMutation) {
        scheduleHighlightDifferences();
    }
};

const startObservingComparisonRows = () => {
    if (!document.body) {
        console.warn('document.body がまだ利用できないため、MutationObserver の設定を後で再試行します。');
        requestAnimationFrame(startObservingComparisonRows);
        return;
    }

    if (mutationObserver) {
        mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
};

const initializeDiffHighlighting = () => {
    highlightComparisonDifferences();
    startObservingComparisonRows();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDiffHighlighting);
} else {
    initializeDiffHighlighting();
}

const getState = () => ({ diffCount, isHighlightEnabled, isDiffOnlyMode });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.action) {
        case ACTIONS.GET_STATE:
            sendResponse(getState());
            break;

        case ACTIONS.SET_HIGHLIGHT:
            isHighlightEnabled = message.value;
            if (!isHighlightEnabled) {
                isDiffOnlyMode = false;
            }
            highlightComparisonDifferences();
            sendResponse(getState());
            break;

        case ACTIONS.SET_DIFF_ONLY:
            if (isHighlightEnabled) {
                isDiffOnlyMode = message.value;
                highlightComparisonDifferences();
            }
            sendResponse(getState());
            break;

        default:
            sendResponse({ error: 'unknown action' });
    }
});
