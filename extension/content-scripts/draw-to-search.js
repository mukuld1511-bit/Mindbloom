// MindBloom Draw-to-Search Script

(function() {
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let overlay = null;
  let drawBox = null;

  // Listen for activation from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ACTIVATE_DRAW_MODE') {
      activateDrawMode();
      sendResponse({ status: 'activated' });
    }
  });

  function activateDrawMode() {
    if (overlay) return; // Already active

    // Create the full-screen transparent overlay
    overlay = document.createElement('div');
    overlay.id = 'mindbloom-draw-overlay';
    
    // Prevent scrolling while drawing
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
    
    // Allow cancellation via Escape key
    document.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);
  }

  function cleanup() {
    if (overlay) {
      overlay.removeEventListener('mousedown', onMouseDown);
      overlay.removeEventListener('mousemove', onMouseMove);
      overlay.removeEventListener('mouseup', onMouseUp);
      overlay.remove();
      overlay = null;
    }
    if (drawBox) {
      drawBox.remove();
      drawBox = null;
    }
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);
    isDrawing = false;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function onMouseDown(e) {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;

    if (overlay) {
      overlay.classList.add('drawing-active');
    }

    drawBox = document.createElement('div');
    drawBox.id = 'mindbloom-draw-box';
    drawBox.style.left = `${startX}px`;
    drawBox.style.top = `${startY}px`;
    drawBox.style.width = '0px';
    drawBox.style.height = '0px';
    
    document.body.appendChild(drawBox);
  }

  function onMouseMove(e) {
    if (!isDrawing) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    drawBox.style.left = `${left}px`;
    drawBox.style.top = `${top}px`;
    drawBox.style.width = `${width}px`;
    drawBox.style.height = `${height}px`;
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    // Get final box coordinates
    const rect = drawBox.getBoundingClientRect();
    
    // Slight delay to remove the overlay so we don't interfere with elementsFromPoint
    cleanup();

    if (rect.width > 20 && rect.height > 20) {
      extractTextInRect(rect);
    }
  }

  function extractTextInRect(rect) {
    // We walk through all text nodes on the page and check if their parent element
    // falls within the drawn rectangle.
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let collectedText = [];
    let node;

    while ((node = walker.nextNode())) {
      const text = node.nodeValue.trim();
      if (!text) continue;

      const parentEl = node.parentElement;
      if (!parentEl) continue;

      // Ignore scripts, styles, etc.
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(parentEl.tagName)) continue;

      const elRect = parentEl.getBoundingClientRect();

      // Check intersection
      const isIntersecting = !(
        elRect.right < rect.left || 
        elRect.left > rect.right || 
        elRect.bottom < rect.top || 
        elRect.top > rect.bottom
      );

      if (isIntersecting) {
        // To avoid duplicating text from nested elements, we only add if it's substantial
        collectedText.push(text);
      }
    }

    // Clean up collected text
    const finalContent = collectedText.join(' ').replace(/\s+/g, ' ').trim();
    
    if (finalContent.length > 5) {
      showFloatingIngestButton(finalContent, rect);
    }
  }

  function showFloatingIngestButton(content, rect) {
    // Reuse the UI pattern from selection-popup.js
    const popupBtn = document.createElement('div');
    popupBtn.id = 'mindbloom-area-popup'; // Use a different ID to avoid conflict, but same CSS logic
    popupBtn.className = 'mindbloom-visible';
    
    // Apply styles directly or reuse from selection-popup.css by adding its class logic
    // We'll apply inline styles to match the popup button for simplicity here, 
    // or rely on selection-popup.css if it uses a generic class.
    // For safety, let's use the same ID used in selection-popup.css: #mindbloom-selection-popup
    popupBtn.id = 'mindbloom-selection-popup'; 
    popupBtn.innerHTML = `
      <span class="mindbloom-icon">🌱</span>
      <span class="mindbloom-text">Ingest Area</span>
    `;

    // Position it at the bottom-right of the drawn box
    popupBtn.style.top = `${Math.max(10, rect.bottom + window.scrollY + 10)}px`;
    popupBtn.style.left = `${Math.max(10, rect.right + window.scrollX - 100)}px`;
    
    document.body.appendChild(popupBtn);

    // Hide on click outside
    const outsideClickListener = (e) => {
      if (!popupBtn.contains(e.target)) {
        popupBtn.remove();
        document.removeEventListener('mousedown', outsideClickListener);
      }
    };
    // small delay so we don't trigger mousedown immediately
    setTimeout(() => {
      document.addEventListener('mousedown', outsideClickListener);
    }, 50);

    popupBtn.addEventListener('click', () => {
      popupBtn.classList.add('mindbloom-success');
      popupBtn.innerHTML = `
        <span class="mindbloom-icon">✓</span>
        <span class="mindbloom-text">Sent</span>
      `;

      chrome.runtime.sendMessage({
        type: 'CAPTURE_AND_SEND',
        payload: {
          title: `Area Selection from ${document.title || 'Web'}`,
          content: content,
          sourceUrl: window.location.href
        }
      });

      setTimeout(() => {
        popupBtn.remove();
        document.removeEventListener('mousedown', outsideClickListener);
      }, 1500);
    });
  }

})();
