const FORTUNE_TIERS = [
    [1,        'fortune_top_1'],
    [10,       'fortune_top_10'],
    [30,       'fortune_top_30'],
    [70,       'fortune_top_70'],
    [90,       'fortune_bottom_30'],
    [99,       'fortune_bottom_10'],
    [Infinity, 'fortune_bottom_1'],
];

const getFortuneMessage = () => {
    const randomValue = Math.random() * 100;
    const [, key] = FORTUNE_TIERS.find(([threshold]) => randomValue < threshold);
    return chrome.i18n.getMessage(key);
};

const sendToContent = (tabId, message) =>
    new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });

const applyState = ({ diffCount, isHighlightEnabled, isDiffOnlyMode }) => {
    const diffCountText   = document.getElementById('diffCountText');
    const highlightToggle = document.getElementById('highlightToggle');
    const diffOnlyToggle  = document.getElementById('diffOnlyToggle');

    diffCountText.textContent = chrome.i18n.getMessage('diff_count_label', [String(diffCount)]);
    highlightToggle.checked   = isHighlightEnabled;
    diffOnlyToggle.checked    = isDiffOnlyMode;
    diffOnlyToggle.disabled   = !isHighlightEnabled;
};

const showNotTarget = () => {
    document.getElementById('mainContent').style.display     = 'none';
    document.getElementById('notTargetContent').style.display = '';
};

document.addEventListener('DOMContentLoaded', async () => {
    document.documentElement.lang = navigator.language.startsWith('ja') ? 'ja' : 'en';

    const extensionName = chrome.i18n.getMessage('extension_name');
    document.title = extensionName;
    document.getElementById('headerTitle').textContent    = extensionName;
    document.getElementById('statusText').textContent     = chrome.i18n.getMessage('status_active');
    document.getElementById('highlightLabel').textContent = chrome.i18n.getMessage('highlight_label');
    document.getElementById('highlightSub').textContent   = chrome.i18n.getMessage('highlight_sub');
    document.getElementById('diffOnlyLabel').textContent  = chrome.i18n.getMessage('diff_only_label');
    document.getElementById('diffOnlySub').textContent    = chrome.i18n.getMessage('diff_only_sub');
    document.getElementById('notTargetText').textContent  = chrome.i18n.getMessage('not_target_page');
    document.getElementById('fortuneButton').textContent  = chrome.i18n.getMessage('fortune_button_label');

    const donationLink    = document.getElementById('donationLink');
    const donationLinkUrl = chrome.i18n.getMessage('donation_link_url');
    donationLink.textContent = chrome.i18n.getMessage('donation_link_text');
    donationLink.href        = donationLinkUrl;

    donationLink.addEventListener('click', (event) => {
        event.preventDefault();
        if (chrome?.tabs?.create) {
            chrome.tabs.create({ url: donationLinkUrl });
        } else {
            window.open(donationLinkUrl, '_blank');
        }
    });

    document.getElementById('fortuneButton').addEventListener('click', () => {
        alert(getFortuneMessage());
    });

    // アクティブタブを取得
    let tab;
    try {
        [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch {
        showNotTarget();
        return;
    }

    if (!tab?.id) {
        showNotTarget();
        return;
    }

    // 対象URLか確認
    const isTargetUrl = /^https:\/\/www\.apple\.com\/jp\/[^/]+\/compare\//.test(tab.url ?? '');
    if (!isTargetUrl) {
        showNotTarget();
        return;
    }

    // content script から状態取得
    let state;
    try {
        state = await sendToContent(tab.id, { action: 'getState' });
    } catch {
        showNotTarget();
        return;
    }

    if (!state) {
        showNotTarget();
        return;
    }

    applyState(state);

    // トグルイベント
    document.getElementById('highlightToggle').addEventListener('change', async (e) => {
        try {
            const newState = await sendToContent(tab.id, { action: 'setHighlight', value: e.target.checked });
            applyState(newState);
        } catch { /* ページが閉じた等 */ }
    });

    document.getElementById('diffOnlyToggle').addEventListener('change', async (e) => {
        try {
            const newState = await sendToContent(tab.id, { action: 'setDiffOnly', value: e.target.checked });
            applyState(newState);
        } catch { /* 同上 */ }
    });
});
