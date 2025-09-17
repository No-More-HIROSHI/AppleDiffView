document.addEventListener('DOMContentLoaded', function() {
    console.log("Current browser language: ", navigator.language);
    document.documentElement.lang = navigator.language.startsWith('ja') ? 'ja' : 'en';

    // ローカライズメッセージの適用
    const extensionNameMessage = chrome.i18n.getMessage('extension_name');
    document.title = extensionNameMessage;
    document.getElementById('extensionName').innerText = extensionNameMessage;
    document.getElementById('extensionDescription').innerText = chrome.i18n.getMessage('short_description');
    document.getElementById('fortuneButton').innerText = chrome.i18n.getMessage('fortune_button_label');

    // ボタンの機能
    const fortuneButton = document.getElementById('fortuneButton');
    fortuneButton.addEventListener('click', function() {
        const randomValue = Math.random() * 100;
        let message;

        if (randomValue < 1) {
            message = chrome.i18n.getMessage('fortune_top_1');
        } else if (randomValue < 10) {
            message = chrome.i18n.getMessage('fortune_top_10');
        } else if (randomValue < 30) {
            message = chrome.i18n.getMessage('fortune_top_30');
        } else if (randomValue < 70) {
            message = chrome.i18n.getMessage('fortune_top_70');
        } else if (randomValue < 90) {
            message = chrome.i18n.getMessage('fortune_bottom_30');
        } else if (randomValue < 99) {
            message = chrome.i18n.getMessage('fortune_bottom_10');
        } else {
            message = chrome.i18n.getMessage('fortune_bottom_1');
        }

        alert(message);
    });
});
