// MindBloom Chrome Extension Background Service Worker

const DEFAULT_BACKEND_URL = 'http://localhost:3000';

// Register Context Menu on Installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'mindbloom-capture-selection',
    title: 'Send selection to MindBloom',
    contexts: ['selection']
  });
});

// Handle Context Menu Item Click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'mindbloom-capture-selection' && info.selectionText) {
    const payload = {
      title: tab?.title ? `Selection from ${tab.title}` : 'Selected Text',
      content: info.selectionText,
      sourceUrl: tab?.url || ''
    };
    await sendToBackend(payload);
  }
});

// Listen for Messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_AND_SEND') {
    sendToBackend(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

async function getBackendUrl() {
  const data = await chrome.storage.sync.get(['backendUrl']);
  const url = data.backendUrl || DEFAULT_BACKEND_URL;
  return url.replace(/\/$/, '');
}

async function sendToBackend(payload) {
  const backendUrl = await getBackendUrl();
  const endpoint = `${backendUrl}/api/sources`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server returned HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  return await response.json();
}
