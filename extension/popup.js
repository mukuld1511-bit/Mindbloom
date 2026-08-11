// MindBloom Chrome Extension Popup Logic

let currentExtractedData = null;
let backendUrl = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  // Read backend URL from storage
  const storage = await chrome.storage.sync.get(['backendUrl']);
  if (storage.backendUrl) {
    backendUrl = storage.backendUrl.replace(/\/$/, '');
  } else {
    document.getElementById('unconfigured-warning').classList.remove('hidden');
  }

  // Update Open App Link
  const openAppLink = document.getElementById('open-app-link');
  openAppLink.href = backendUrl;

  // Query Active Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  document.getElementById('page-title').textContent = tab.title || 'Untitled Page';
  document.getElementById('page-url').textContent = tab.url || '';

  // Extract content preview from active tab
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-scripts/extract.js']
    });

    if (results && results[0] && results[0].result) {
      currentExtractedData = results[0].result;
      
      if (currentExtractedData.hasSelection) {
        document.getElementById('selection-notice').classList.remove('hidden');
        document.getElementById('btn-text').textContent = 'Send Selection to MindBloom';
      } else {
        document.getElementById('btn-text').textContent = 'Send Page Article to MindBloom';
      }
    }
  } catch (err) {
    console.warn('Unable to inject script on tab:', err);
  }

  // Bind Capture Button Click
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.addEventListener('click', handleCapture);
});

async function handleCapture() {
  const captureBtn = document.getElementById('capture-btn');
  const statusCard = document.getElementById('status-card');
  const statusText = document.getElementById('status-text');
  const resultCounts = document.getElementById('result-counts');

  captureBtn.disabled = true;
  statusCard.className = 'status-card';
  statusCard.classList.remove('hidden');
  statusText.textContent = 'Analyzing text & generating knowledge graph...';
  resultCounts.classList.add('hidden');

  try {
    // Fallback extraction if not cached
    if (!currentExtractedData) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/extract.js']
      });
      if (results && results[0]) {
        currentExtractedData = results[0].result;
      }
    }

    if (!currentExtractedData || !currentExtractedData.content) {
      throw new Error('No readable article text found on this page.');
    }

    // Send payload via chrome.runtime messaging to background worker
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_AND_SEND',
      payload: {
        title: currentExtractedData.title,
        content: currentExtractedData.content,
        sourceUrl: currentExtractedData.url
      }
    });

    if (response && response.success) {
      const data = response.data;
      statusCard.className = 'status-card success';
      statusText.textContent = '✓ Successfully analyzed & added to MindBloom!';
      
      document.getElementById('ent-count').textContent = data.entities_count || 0;
      document.getElementById('q-count').textContent = data.questions_generated || 0;
      resultCounts.classList.remove('hidden');
    } else {
      throw new Error((response && response.error) || 'Failed to connect to MindBloom backend.');
    }
  } catch (error) {
    statusCard.className = 'status-card error';
    statusText.textContent = `Error: ${error.message}`;
  } finally {
    captureBtn.disabled = false;
  }
}
