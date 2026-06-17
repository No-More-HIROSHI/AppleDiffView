// 共有定数 (APPLE_DIFF) は constants.js で定義され、popup.html で
// constants.js → popup.js の順に読み込まれる。
const { ACTIONS } = APPLE_DIFF;

// manifest の content_scripts マッチパターン (…/jp/*/compare/*) と整合させる。
// `*` は `/` を含む任意文字にマッチするため、ここでも `.+` で複数セグメントを許容する。
const TARGET_URL_PATTERN = /^https:\/\/www\.apple\.com\/jp\/.+\/compare\//;

// 要素 id → i18n メッセージキー（textContent を入れるだけのもの）
const TEXT_BINDINGS = {
    headerTitle:    'extension_name',
    statusText:     'status_active',
    highlightLabel: 'highlight_label',
    highlightSub:   'highlight_sub',
    diffOnlyLabel:  'diff_only_label',
    diffOnlySub:    'diff_only_sub',
    notTargetText:  'not_target_page',
    fortuneButton:  'fortune_button_label',
};

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
    document.getElementById('mainContent').style.display      = 'none';
    document.getElementById('notTargetContent').style.display = '';
};

const applyLocalizedText = () => {
    for (const [id, messageKey] of Object.entries(TEXT_BINDINGS)) {
        document.getElementById(id).textContent = chrome.i18n.getMessage(messageKey);
    }
    document.title = chrome.i18n.getMessage('extension_name');
};

const setupDonationLink = () => {
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
};

const getActiveTab = async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab ?? null;
    } catch {
        return null;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    document.documentElement.lang = navigator.language.startsWith('ja') ? 'ja' : 'en';

    applyLocalizedText();
    setupDonationLink();

    document.getElementById('fortuneButton').addEventListener('click', () => {
        alert(getFortuneMessage());
    });

    const tab = await getActiveTab();
    if (!tab?.id || !TARGET_URL_PATTERN.test(tab.url ?? '')) {
        showNotTarget();
        return;
    }

    // content script から状態取得
    let state;
    try {
        state = await sendToContent(tab.id, { action: ACTIONS.GET_STATE });
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
            const newState = await sendToContent(tab.id, { action: ACTIONS.SET_HIGHLIGHT, value: e.target.checked });
            applyState(newState);
        } catch { /* ページが閉じた等 */ }
    });

    document.getElementById('diffOnlyToggle').addEventListener('change', async (e) => {
        try {
            const newState = await sendToContent(tab.id, { action: ACTIONS.SET_DIFF_ONLY, value: e.target.checked });
            applyState(newState);
        } catch { /* 同上 */ }
    });
});
