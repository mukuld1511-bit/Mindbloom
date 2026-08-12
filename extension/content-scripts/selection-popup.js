// MindBloom Floating Selection Button Script

(function() {
  // Create the floating button element
  const popupBtn = document.createElement('div');
  popupBtn.id = 'mindbloom-selection-popup';
  popupBtn.innerHTML = `
    <span class="mindbloom-icon">🌱</span>
    <span class="mindbloom-text">Ingest</span>
  `;
  document.body.appendChild(popupBtn);

  let currentSelection = '';
  let hideTimeout;

  // Listen for mouseup to check if text was selected
  document.addEventListener('mouseup', (e) => {
    // Don't trigger if clicking on the popup itself
    if (popupBtn.contains(e.target)) return;

    // Small delay to allow double-click selection to register
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 5) {
        currentSelection = text;
        
        // Get the bounding rect of the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the button slightly above and to the center of the selection
        const top = rect.top + window.scrollY - 45; // 45px above
        const left = rect.left + window.scrollX + (rect.width / 2) - (popupBtn.offsetWidth / 2);
        
        popupBtn.style.top = `${Math.max(10, top)}px`; // Prevent going off-screen top
        popupBtn.style.left = `${Math.max(10, left)}px`;
        
        // Show the button
        popupBtn.classList.remove('mindbloom-success');
        popupBtn.innerHTML = `
          <span class="mindbloom-icon">🌱</span>
          <span class="mindbloom-text">Ingest</span>
        `;
        popupBtn.classList.add('mindbloom-visible');
        
        // Auto-hide after 5 seconds of inactivity
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(hidePopup, 5000);
      } else {
        hidePopup();
      }
    }, 10);
  });

  // Hide on mousedown outside
  document.addEventListener('mousedown', (e) => {
    if (!popupBtn.contains(e.target)) {
      hidePopup();
    }
  });

  // Handle clicking the button
  popupBtn.addEventListener('mousedown', (e) => {
    // Prevent the default mousedown so it doesn't clear the text selection
    e.preventDefault();
  });

  popupBtn.addEventListener('click', () => {
    if (!currentSelection) return;
    
    // Play success animation
    popupBtn.classList.add('mindbloom-success');
    popupBtn.innerHTML = `
      <span class="mindbloom-icon">✓</span>
      <span class="mindbloom-text">Sent</span>
    `;
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'CAPTURE_AND_SEND',
      payload: {
        title: `Selection from ${document.title || 'Web'}`,
        content: currentSelection,
        sourceUrl: window.location.href
      }
    });
    
    // Clear selection and hide after animation
    window.getSelection().removeAllRanges();
    clearTimeout(hideTimeout);
    setTimeout(hidePopup, 1500);
  });

  function hidePopup() {
    popupBtn.classList.remove('mindbloom-visible');
    currentSelection = '';
  }
})();
