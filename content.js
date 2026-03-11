const HIGHLIGHT_CLASS_NAME = 'apple-diff-view__highlight';
const HIGHLIGHT_STYLE_ID = 'apple-diff-view-highlight-style';
const HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.3)';
const DIFF_ONLY_HIDDEN_CLASS = 'apple-diff-view__hidden-row';
const MISSING_ROW_RETRY_DELAY_MS = 100;
const MISSING_ROW_WARNING_MESSAGE = "セレクタにマッチする行が見つかりませんでした。\nHTML構造を確認してください。またはクラス名が変更されていないかご確認ください。";

let mutationObserver = null;
let isDiffCheckScheduled = false;
let hasLoggedMissingRows = false;
let hasSeenCompareRows = false;
let pendingMissingRowCheck = null;

let isHighlightEnabled = true;
let isDiffOnlyMode = false;
let diffCount = 0;

const ensureHighlightStyle = () => {
    if (document.getElementById(HIGHLIGHT_STYLE_ID)) {
        return;
    }

    const head = document.head || document.querySelector('head');
    if (!head) {
        console.warn('head 要素が見つからないため、ハイライト用スタイルを挿入できません。');
        return;
    }

    const style = document.createElement('style');
    style.id = HIGHLIGHT_STYLE_ID;
    style.textContent = [
        `.${HIGHLIGHT_CLASS_NAME} { background-color: ${HIGHLIGHT_COLOR} !important; }`,
        `.${DIFF_ONLY_HIDDEN_CLASS} { display: none !important; }`,
    ].join('\n');
    head.appendChild(style);
};

const highlightComparisonDifferences = () => {
    ensureHighlightStyle();

    const rows = document.querySelectorAll('.compare-row');

    if (rows.length === 0) {
        if (hasSeenCompareRows) {
            if (!hasLoggedMissingRows) {
                console.warn(MISSING_ROW_WARNING_MESSAGE);
                hasLoggedMissingRows = true;
            }
        } else if (!pendingMissingRowCheck && !hasLoggedMissingRows) {
            pendingMissingRowCheck = setTimeout(() => {
                pendingMissingRowCheck = null;

                const retryRows = document.querySelectorAll('.compare-row');
                if (retryRows.length === 0) {
                    if (!hasLoggedMissingRows) {
                        console.warn(MISSING_ROW_WARNING_MESSAGE);
                        hasLoggedMissingRows = true;
                    }
                    return;
                }

                hasSeenCompareRows = true;
                hasLoggedMissingRows = false;
                highlightComparisonDifferences();
            }, MISSING_ROW_RETRY_DELAY_MS);
        }
        return;
    }

    if (pendingMissingRowCheck) {
        clearTimeout(pendingMissingRowCheck);
        pendingMissingRowCheck = null;
    }

    hasSeenCompareRows = true;
    hasLoggedMissingRows = false;

    let count = 0;

    rows.forEach((row) => {
        const cells = row.querySelectorAll('.compare-column, .compare-cell');

        if (cells.length > 1) {
            const cellsArray = Array.from(cells);
            const values = cellsArray.map(cell => cell.textContent.trim());
            const allEmpty = values.every(v => v === '');
            const hasVisualContent = cellsArray.some(cell => cell.querySelector('img, picture, video'));
            const isVisualRow = allEmpty || hasVisualContent;
            const isDifferent = !isVisualRow && values.some(value => value !== values[0]);

            if (isDifferent) {
                count++;
                if (isHighlightEnabled) {
                    row.classList.add(HIGHLIGHT_CLASS_NAME);
                } else {
                    row.classList.remove(HIGHLIGHT_CLASS_NAME);
                }
                row.classList.remove(DIFF_ONLY_HIDDEN_CLASS);
            } else if (!isVisualRow) {
                // テキストが同一の行 → 差分のみ表示モードで非表示候補
                row.classList.remove(HIGHLIGHT_CLASS_NAME);
                if (isHighlightEnabled && isDiffOnlyMode) {
                    row.classList.add(DIFF_ONLY_HIDDEN_CLASS);
                } else {
                    row.classList.remove(DIFF_ONLY_HIDDEN_CLASS);
                }
            } else {
                // 画像・空テキストのヘッダー行 → 常に表示
                row.classList.remove(HIGHLIGHT_CLASS_NAME);
                row.classList.remove(DIFF_ONLY_HIDDEN_CLASS);
            }
        } else {
            row.classList.remove(HIGHLIGHT_CLASS_NAME);
            row.classList.remove(DIFF_ONLY_HIDDEN_CLASS);
        }
    });

    diffCount = count;
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
        return node.closest('.compare-row');
    }

    return node.parentElement?.closest('.compare-row') ?? null;
};

const nodeContainsCompareRow = (node) => {
    if (!node) {
        return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        return node.matches('.compare-row') || Boolean(node.querySelector('.compare-row'));
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
        case 'getState':
            sendResponse(getState());
            break;

        case 'setHighlight':
            isHighlightEnabled = message.value;
            if (!isHighlightEnabled) {
                isDiffOnlyMode = false;
            }
            highlightComparisonDifferences();
            sendResponse(getState());
            break;

        case 'setDiffOnly':
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
