// ============================================================================
// Cut From Word - Extensão para SillyTavern
// Corta a mensagem a partir de uma palavra, preservando a frase até o ponto final
// ============================================================================

import { extension_settings, getContext } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "cut-from-word";
const extensionSettings = extension_settings[extensionName];

const defaultSettings = {
    confirmBeforeCut: true,
    cutToSentenceEnd: true,
    includeWordInCut: false,
    showVisualIndicator: true,
    indicatorDuration: 3000,
    workOnUserMessages: true,
    workOnAIMessage: true,
};

let isInitialized = false;

function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }
}

function getSelectedWord() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const text = selection.toString().trim();
    return text || null;
}

function getMessageDiv(target) {
    let element = target;
    while (element && element !== document.body) {
        if (element.hasAttribute && element.hasAttribute('mesid')) {
            return element;
        }
        element = element.parentElement;
    }
    return null;
}

function getMessageTextDiv(mesDiv) {
    return mesDiv.querySelector('.mes_text');
}

function getMessageType(mesDiv) {
    if (mesDiv.classList.contains('user') || mesDiv.closest('.user')) {
        return 'user';
    }
    return 'ai';
}

function findMessageInChatData(mesId) {
    const { chat } = getContext();
    if (!chat || !chat.messages) return null;
    return chat.messages.find(m => m.mesId === mesId || m.id === mesId || m.messageId === mesId);
}

function truncateMessage(mesDiv, word, options) {
    const mesTextDiv = getMessageTextDiv(mesDiv);
    if (!mesTextDiv) return false;

    const fullText = mesTextDiv.textContent || mesTextDiv.innerText || '';
    const wordIndex = fullText.indexOf(word);

    if (wordIndex === -1) {
        toastr.warning('Palavra não encontrada no texto da mensagem.');
        return false;
    }

    let cutPosition;

    if (options.cutToSentenceEnd) {
        const startSearch = wordIndex;
        const sentenceEnders = ['.', '!', '?'];
        let foundEnd = -1;

        for (let i = startSearch + word.length; i < fullText.length; i++) {
            if (sentenceEnders.includes(fullText[i])) {
                foundEnd = i;
                break;
            }
        }

        if (foundEnd !== -1) {
            cutPosition = foundEnd + 1;
        } else {
            cutPosition = fullText.length;
        }
    } else {
        cutPosition = options.includeWordInCut ? wordIndex + word.length : wordIndex;
    }

    let newText = fullText.substring(0, cutPosition);
    newText = newText.trimEnd();

    mesTextDiv.textContent = newText;

    const mesId = mesDiv.getAttribute('mesid');
    const message = findMessageInChatData(mesId);
    if (message) {
        message.content = newText;
        saveSettingsDebounced();
    }

    if (options.showVisualIndicator) {
        mesTextDiv.classList.add('cut-from-word-indicator');
        setTimeout(() => {
            mesTextDiv.classList.remove('cut-from-word-indicator');
        }, options.indicatorDuration);
    }

    toastr.success(`Mensagem cortada a partir de: "${word}"`);
    return true;
}

function onDoubleClick(event) {
    const mesTextDiv = event.target.closest('.mes_text');
    if (!mesTextDiv) return;

    const mesDiv = getMessageDiv(event.target);
    if (!mesDiv) return;

    const msgType = getMessageType(mesDiv);
    if (msgType === 'user' && !extensionSettings.workOnUserMessages) return;
    if (msgType === 'ai' && !extensionSettings.workOnAIMessage) return;

    const word = getSelectedWord();
    if (!word) return;

    if (extensionSettings.confirmBeforeCut) {
        const confirmed = confirm(
            `Cortar a mensagem a partir da palavra "${word}"?\n\n` +
            `Todo o texto depois desta palavra será removido.`
        );
        if (!confirmed) {
            return;
        }
    }

    truncateMessage(mesDiv, word, extensionSettings);
}

jQuery(async () => {
    if (isInitialized) return;
    isInitialized = true;

    loadSettings();

    $(document).on('dblclick', '.mes_text', onDoubleClick);

    console.log(`[${extensionName}] Extensão "Cut From Word" carregada com sucesso.`);
});