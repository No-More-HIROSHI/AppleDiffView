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

document.addEventListener('DOMContentLoaded', function() {
    document.documentElement.lang = navigator.language.startsWith('ja') ? 'ja' : 'en';

    const extensionName = chrome.i18n.getMessage('extension_name');
    document.title = extensionName;
    document.getElementById('extensionName').textContent = extensionName;
    document.getElementById('extensionDescription').textContent = chrome.i18n.getMessage('short_description');
    document.getElementById('fortuneButton').textContent = chrome.i18n.getMessage('fortune_button_label');

    const donationMessageElement = document.getElementById('donationMessage');
    donationMessageElement.textContent = chrome.i18n.getMessage('donation_message');

    const donationLink = document.getElementById('donationLink');
    const donationLinkUrl = chrome.i18n.getMessage('donation_link_url');
    donationLink.textContent = chrome.i18n.getMessage('donation_link_text');
    donationLink.href = donationLinkUrl;

    donationMessageElement.appendChild(document.createTextNode(' '));
    donationMessageElement.appendChild(donationLink);

    donationLink.addEventListener('click', function(event) {
        event.preventDefault();
        if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
            chrome.tabs.create({ url: donationLinkUrl });
        } else {
            window.open(donationLinkUrl, '_blank');
        }
    });

    document.getElementById('fortuneButton').addEventListener('click', function() {
        alert(getFortuneMessage());
    });
});
