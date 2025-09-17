console.log("content.jsが実行されました");

const HIGHLIGHT_CLASS_NAME = 'apple-diff-view__highlight';
const HIGHLIGHT_STYLE_ID = 'apple-diff-view-highlight-style';
const HIGHLIGHT_COLOR = 'rgba(255, 255, 0, 0.3)';
let mutationObserver = null;
let isDiffCheckScheduled = false;
let hasLoggedMissingRows = false;

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
    style.textContent = `.${HIGHLIGHT_CLASS_NAME} { background-color: ${HIGHLIGHT_COLOR} !important; }`;
    head.appendChild(style);
};

const highlightComparisonDifferences = () => {
    ensureHighlightStyle();

    const rows = document.querySelectorAll('.compare-row');
    console.log(`取得した行数: ${rows.length}`);

    if (rows.length === 0) {
        if (!hasLoggedMissingRows) {
            console.warn("セレクタにマッチする行が見つかりませんでした。\nHTML構造を確認してください。またはクラス名が変更されていないかご確認ください。");
            hasLoggedMissingRows = true;
        }
        return;
    }

    hasLoggedMissingRows = false;

    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('.compare-column, .compare-cell');
        console.log(`行 ${rowIndex + 1} のセル数: ${cells.length}`);

        if (cells.length > 1) {
            const valuesArray = Array.from(cells).map(cell => cell.textContent.trim());
            console.log(`行 ${rowIndex + 1} のセルの値:`, valuesArray);

            const firstValue = valuesArray[0];
            const isDifferent = valuesArray.some(value => value !== firstValue);

            if (isDifferent) {
                if (!row.classList.contains(HIGHLIGHT_CLASS_NAME)) {
                    row.classList.add(HIGHLIGHT_CLASS_NAME);
                    console.log(`行 ${rowIndex + 1} に異なる値が見つかったため、背景色を適用しました。`);
                }
            } else if (row.classList.contains(HIGHLIGHT_CLASS_NAME)) {
                row.classList.remove(HIGHLIGHT_CLASS_NAME);
                console.log(`行 ${rowIndex + 1} の差分が解消されたため、背景色をリセットしました。`);
            }
        } else if (row.classList.contains(HIGHLIGHT_CLASS_NAME)) {
            row.classList.remove(HIGHLIGHT_CLASS_NAME);
        }
    });

    console.log(`${rows.length} 個の行をチェックしました。`);
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

    if ('parentElement' in node && node.parentElement) {
        return node.parentElement.closest('.compare-row');
    }

    return null;
};

const nodeContainsCompareRow = (node) => {
    if (!node) {
        return false;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches('.compare-row')) {
            return true;
        }

        return Boolean(node.querySelector('.compare-row'));
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

        const added = Array.from(mutation.addedNodes).some(nodeContainsCompareRow);
        if (added) {
            return true;
        }

        return Array.from(mutation.removedNodes).some(nodeContainsCompareRow);
    });

    if (hasRelevantMutation) {
        console.log('比較表のDOM変化を検知したため、差分判定を再実行します。');
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

    console.log('MutationObserver を設定しました。');
};

const initializeDiffHighlighting = () => {
    console.log('差分判定の初期化を実行します。');
    highlightComparisonDifferences();
    startObservingComparisonRows();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded イベントを受信しました。');
        initializeDiffHighlighting();
    });
} else {
    console.log('document.readyState を確認し、即時初期化を実行します。');
    initializeDiffHighlighting();
}
