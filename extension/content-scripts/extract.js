// MindBloom Content Extraction Script (Vanilla JS)

(() => {
  // 1. Check if user currently has highlighted/selected text
  const selectedText = window.getSelection() ? window.getSelection().toString().trim() : '';

  if (selectedText.length > 10) {
    return {
      title: document.title || 'Selected Text Capture',
      content: selectedText,
      url: window.location.href,
      hasSelection: true
    };
  }

  // 2. Readability Heuristic for main body article extraction
  function cleanAndExtractMainText() {
    // Clone body to avoid mutating actual webpage DOM
    const bodyClone = document.body.cloneNode(true);

    // Remove non-article noise elements
    const noiseSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg',
      'nav', 'header', 'footer', 'aside',
      '.comments', '#comments', '.sidebar', '.ad', '.advertisement',
      '.social-share', '.related-posts'
    ];

    noiseSelectors.forEach(selector => {
      bodyClone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Check for semantic article containers
    const semanticContainers = bodyClone.querySelectorAll('article, main, [role="main"], .post-content, .article-content, #content');
    if (semanticContainers.length > 0) {
      let bestContainer = semanticContainers[0];
      let maxTextLength = 0;

      semanticContainers.forEach(container => {
        const textLen = container.textContent.trim().length;
        if (textLen > maxTextLength) {
          maxTextLength = textLen;
          bestContainer = container;
        }
      });

      if (maxTextLength > 100) {
        return bestContainer.textContent.replace(/\s+/g, ' ').trim();
      }
    }

    // Paragraph block density scoring heuristic
    const paragraphs = bodyClone.querySelectorAll('p');
    let aggregatedText = [];
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      // Only keep substantial sentences (avoid short boilerplate links/buttons)
      if (text.length > 30) {
        aggregatedText.push(text);
      }
    });

    if (aggregatedText.length > 0) {
      return aggregatedText.join('\n\n');
    }

    // Ultimate fallback: full body innerText
    return bodyClone.textContent.replace(/\s+/g, ' ').trim().slice(0, 5000);
  }

  const extractedContent = cleanAndExtractMainText();

  return {
    title: document.title || 'Web Capture',
    content: extractedContent,
    url: window.location.href,
    hasSelection: false
  };
})();
