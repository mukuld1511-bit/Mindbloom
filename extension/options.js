// MindBloom Extension Options Logic

document.addEventListener('DOMContentLoaded', async () => {
  const backendInput = document.getElementById('backend-url');
  const testBtn = document.getElementById('test-btn');
  const saveBtn = document.getElementById('save-btn');
  const testStatus = document.getElementById('test-status');
  const testStatusText = document.getElementById('test-status-text');

  // Load existing configuration
  const data = await chrome.storage.sync.get(['backendUrl']);
  backendInput.value = data.backendUrl || 'http://localhost:3000';

  // Test Connection
  testBtn.addEventListener('click', async () => {
    testStatus.className = 'status-card';
    testStatus.classList.remove('hidden');
    testStatusText.textContent = 'Testing connection to server...';

    const rawUrl = backendInput.value.trim().replace(/\/$/, '');
    try {
      const res = await fetch(`${rawUrl}/api/health`);
      if (res.ok) {
        const body = await res.json();
        testStatus.className = 'status-card success';
        testStatusText.textContent = `✓ Connected successfully! Service: ${body.service || 'MindBloom Backend'}`;
      } else {
        throw new Error(`Server returned status HTTP ${res.status}`);
      }
    } catch (err) {
      testStatus.className = 'status-card error';
      testStatusText.textContent = `✗ Connection failed: ${err.message}`;
    }
  });

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const rawUrl = backendInput.value.trim().replace(/\/$/, '');
    await chrome.storage.sync.set({ backendUrl: rawUrl });

    testStatus.className = 'status-card success';
    testStatus.classList.remove('hidden');
    testStatusText.textContent = '✓ Configuration saved successfully!';
  });
});
