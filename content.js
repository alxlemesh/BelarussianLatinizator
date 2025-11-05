/**
 * Content script for converting Belarusian Cyrillic to Łacinka
 */

(function () {
  "use strict";

  // Track processed nodes to avoid re-processing
  const processedNodes = new WeakSet();

  // Extension state
  let extensionEnabled = true;
  let translationEnabled = false;
  let autoTranslateEnabled = false;
  let observer = null;

  /**
   * Get current domain
   */
  function getCurrentDomain() {
    return window.location.hostname;
  }

  /**
   * Check if translation should be active
   */
  async function checkTranslationStatus() {
    try {
      const result = await chrome.storage.sync.get({
        enabled: true,
        autoTranslate: false,
        enabledSites: [],
      });

      extensionEnabled = result.enabled;
      autoTranslateEnabled = result.autoTranslate;
      const currentDomain = getCurrentDomain();
      translationEnabled =
        extensionEnabled && result.enabledSites.includes(currentDomain);

      return translationEnabled;
    } catch (e) {
      console.error("Łacinka: Error checking translation status", e);
      return false;
    }
  }

  /**
   * Process a single text node (without auto-translation - use processPageWithTranslation for batch)
   */
  function processTextNode(node, translatedText = null) {
    if (
      !translationEnabled ||
      !node ||
      !node.nodeValue ||
      processedNodes.has(node)
    ) {
      return;
    }

    let textToProcess = translatedText || node.nodeValue;

    // If we received translated text, it means it was already translated from another language
    // In this case, we should always transliterate it (assuming it's now in Belarusian Cyrillic)
    const wasTranslated = translatedText !== null;

    // If text contains non-Belarusian Cyrillic and auto-translate is NOT enabled, skip it
    // This prevents mixed Latin-Cyrillic text like "Pиrotiechnиčieskaja"
    if (
      !wasTranslated &&
      belarusianTransliterator.needsTranslation(textToProcess) &&
      !autoTranslateEnabled
    ) {
      return; // Skip transliteration - needs translation first
    }

    // Check if the text contains Belarusian characters OR was translated
    if (wasTranslated || belarusianTransliterator.isBelarusian(textToProcess)) {
      const transliteratedText = belarusianTransliterator.transliterate(
        textToProcess,
        wasTranslated
      );

      if (transliteratedText !== node.nodeValue) {
        node.nodeValue = transliteratedText;
        processedNodes.add(node);
      }
    }
  }

  /**
   * Process a single text node with auto-translation (for dynamic content)
   */
  async function processTextNodeWithAutoTranslate(node) {
    if (
      !translationEnabled ||
      !node ||
      !node.nodeValue ||
      processedNodes.has(node)
    ) {
      return;
    }

    let textToProcess = node.nodeValue;

    // Auto-translate if enabled and text needs translation (has non-Belarusian Cyrillic)
    if (
      autoTranslateEnabled &&
      belarusianTransliterator.needsTranslation(textToProcess)
    ) {
      try {
        textToProcess = await googleTranslateHelper.translateIfNeeded(
          textToProcess
        );
      } catch (e) {
        console.error("Łacinka: Auto-translation failed", e);
      }
    }

    // Check if the text contains Belarusian characters
    if (belarusianTransliterator.isBelarusian(textToProcess)) {
      const transliteratedText =
        belarusianTransliterator.transliterate(textToProcess);

      if (transliteratedText !== node.nodeValue) {
        node.nodeValue = transliteratedText;
        processedNodes.add(node);
      }
    }
  }

  /**
   * Process element attributes that contain text (without auto-translation - use processPageWithTranslation for batch)
   */
  function processElementAttributes(element, translatedAttributes = null) {
    if (!element || !element.getAttribute) {
      return;
    }

    // Attributes that commonly contain visible text (excluding value)
    const textAttributes = [
      "placeholder",
      "aria-label",
      "aria-placeholder",
      "title",
      "alt",
      "label",
      "data-tooltip",
    ];

    // If we received translated attributes, it means they were already translated
    const wasTranslated = translatedAttributes !== null;

    for (const attr of textAttributes) {
      const value = element.getAttribute(attr);
      if (value) {
        let textToProcess = translatedAttributes?.[attr] || value;

        // Skip if contains non-Belarusian Cyrillic and auto-translate is not enabled
        // But if text was already translated, always process it
        if (
          !wasTranslated &&
          belarusianTransliterator.needsTranslation(textToProcess) &&
          !autoTranslateEnabled
        ) {
          continue; // Skip this attribute
        }

        // If was translated or is Belarusian, transliterate it
        if (
          wasTranslated ||
          belarusianTransliterator.isBelarusian(textToProcess)
        ) {
          const transliteratedValue = belarusianTransliterator.transliterate(
            textToProcess,
            wasTranslated
          );
          if (transliteratedValue !== value) {
            element.setAttribute(attr, transliteratedValue);
          }
        }
      }
    }
    // Note: Input/textarea values are NOT processed to avoid interfering with user input
  }

  /**
   * Process element attributes with auto-translation (for dynamic content)
   */
  async function processElementAttributesWithAutoTranslate(element) {
    if (!element || !element.getAttribute) {
      return;
    }

    // Attributes that commonly contain visible text (excluding value)
    const textAttributes = [
      "placeholder",
      "aria-label",
      "aria-placeholder",
      "title",
      "alt",
      "label",
      "data-tooltip",
    ];

    for (const attr of textAttributes) {
      const value = element.getAttribute(attr);
      if (value) {
        let textToProcess = value;

        // Auto-translate if enabled and text is not Belarusian
        if (
          autoTranslateEnabled &&
          !belarusianTransliterator.isBelarusian(textToProcess)
        ) {
          try {
            textToProcess = await googleTranslateHelper.translateIfNeeded(
              textToProcess
            );
          } catch (e) {
            console.error("Łacinka: Auto-translation failed for attribute", e);
          }
        }

        if (belarusianTransliterator.isBelarusian(textToProcess)) {
          const transliteratedValue =
            belarusianTransliterator.transliterate(textToProcess);
          if (transliteratedValue !== value) {
            element.setAttribute(attr, transliteratedValue);
          }
        }
      }
    }
    // Note: Input/textarea values are NOT processed to avoid interfering with user input
  }

  /**
   * Recursively process all text nodes in an element
   */
  async function processElement(element) {
    if (!element || processedNodes.has(element)) {
      return;
    }

    // Skip script, style, and other non-text elements
    const skipTags = ["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT"];
    if (skipTags.includes(element.tagName)) {
      return;
    }

    // Process element attributes
    processElementAttributes(element);

    // Process attributes of all child elements
    if (element.querySelectorAll) {
      const children = Array.from(element.querySelectorAll("*"));
      for (const child of children) {
        processElementAttributes(child);
      }
    }

    // Process all child nodes
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // Skip empty or whitespace-only text nodes
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodesToProcess = [];
    let currentNode;

    while ((currentNode = walker.nextNode())) {
      nodesToProcess.push(currentNode);
    }

    // Process collected nodes
    for (const node of nodesToProcess) {
      processTextNode(node);
    }

    processedNodes.add(element);
  }

  /**
   * Process the entire page with batch translation
   */
  async function processPageWithTranslation() {
    if (!document.body) {
      return;
    }

    // Skip script, style, and other non-text elements
    const skipTags = ["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT"];

    // Collect all text nodes
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // Skip empty or whitespace-only text nodes
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip text in script/style elements
          let parent = node.parentElement;
          while (parent) {
            if (skipTags.includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }

    // Collect all elements with attributes
    const elementsWithAttrs = [];
    const textAttributes = [
      "placeholder",
      "aria-label",
      "aria-placeholder",
      "title",
      "alt",
      "label",
      "data-tooltip",
    ];

    const allElements = Array.from(document.body.querySelectorAll("*"));
    for (const element of allElements) {
      if (skipTags.includes(element.tagName)) continue;

      for (const attr of textAttributes) {
        if (element.getAttribute(attr)) {
          elementsWithAttrs.push(element);
          break;
        }
      }
    }

    // Batch translate if auto-translate is enabled
    if (autoTranslateEnabled) {
      // Collect all texts that need translation
      const textsToTranslate = [];
      const textNodeIndices = [];
      const attrData = [];

      // Helper function to check if text should be translated
      const shouldTranslate = (text) => {
        if (!text || text.trim().length === 0) return false;

        // If it's already Belarusian, don't translate
        if (belarusianTransliterator.isBelarusian(text)) return false;

        // Only translate if it needs translation (has non-Belarusian Cyrillic)
        if (!belarusianTransliterator.needsTranslation(text)) return false;

        // Skip numeric-only content (like "5", "123", etc.)
        if (/^\d+$/.test(text.trim())) return false;

        // Skip very short texts (1-2 characters) that are likely labels or symbols
        if (text.trim().length <= 2) return false;

        // Skip texts that are just punctuation or symbols
        if (/^[^\w\u0400-\u04FF]+$/.test(text.trim())) return false;

        return true;
      };

      // Collect text node contents
      textNodes.forEach((node, index) => {
        if (shouldTranslate(node.nodeValue)) {
          textsToTranslate.push(node.nodeValue);
          textNodeIndices.push(index);
        }
      });

      // Collect attribute texts
      elementsWithAttrs.forEach((element) => {
        const attrs = {};
        let hasNonBelarusian = false;

        for (const attr of textAttributes) {
          const value = element.getAttribute(attr);
          if (value && shouldTranslate(value)) {
            attrs[attr] = value;
            textsToTranslate.push(value);
            hasNonBelarusian = true;
          }
        }

        if (hasNonBelarusian) {
          attrData.push({ element, attrs });
        }
      });

      // Batch translate all texts at once
      if (textsToTranslate.length > 0) {
        try {
          console.log(
            `Łacinka: Batch translating ${textsToTranslate.length} texts...`
          );

          // Create progress indicator
          const progressDiv = document.createElement("div");
          progressDiv.id = "lacinka-progress";
          progressDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            min-width: 200px;
          `;
          progressDiv.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: 600;">Łacinka Translation</div>
            <div id="lacinka-progress-text">Starting...</div>
            <div style="margin-top: 8px; background: rgba(255,255,255,0.2); height: 6px; border-radius: 3px; overflow: hidden;">
              <div id="lacinka-progress-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
          `;
          document.body.appendChild(progressDiv);

          const translatedTexts = await googleTranslateHelper.batchTranslate(
            textsToTranslate,
            (current, total, percent) => {
              const progressText = document.getElementById(
                "lacinka-progress-text"
              );
              const progressBar = document.getElementById(
                "lacinka-progress-bar"
              );
              if (progressText) {
                progressText.textContent = `Chunk ${current}/${total} (${percent}%)`;
              }
              if (progressBar) {
                progressBar.style.width = `${percent}%`;
              }
            }
          );

          // Remove progress indicator
          setTimeout(() => {
            const elem = document.getElementById("lacinka-progress");
            if (elem) elem.remove();
          }, 1500);

          // Apply translations to text nodes
          let translationIndex = 0;
          for (let i = 0; i < textNodeIndices.length; i++) {
            const nodeIndex = textNodeIndices[i];
            const translatedText = translatedTexts[translationIndex++];
            processTextNode(textNodes[nodeIndex], translatedText);
          }

          // Apply translations to attributes
          for (const { element, attrs } of attrData) {
            const translatedAttrs = {};
            for (const attr in attrs) {
              translatedAttrs[attr] = translatedTexts[translationIndex++];
            }
            processElementAttributes(element, translatedAttrs);
          }

          console.log("Łacinka: Batch translation complete");
        } catch (e) {
          console.error("Łacinka: Batch translation failed", e);
        }
      }
    }

    // Process remaining text nodes (already Belarusian or translation disabled)
    for (const node of textNodes) {
      processTextNode(node);
    }

    // Process remaining attributes
    for (const element of elementsWithAttrs) {
      processElementAttributes(element);
    }
  }

  /**
   * Process the entire page
   */
  async function processPage() {
    if (autoTranslateEnabled) {
      await processPageWithTranslation();
    } else if (document.body) {
      await processElement(document.body);
    }
  }

  /**
   * Set up mutation observer to handle dynamic content
   */
  function setupObserver() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(async function (mutation) {
        if (!translationEnabled) {
          return;
        }

        // Process added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            await processElement(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            await processTextNodeWithAutoTranslate(node);
          }
        }

        // Process modified text content
        if (
          mutation.type === "characterData" &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          // Remove from processed set to allow re-processing
          processedNodes.delete(mutation.target);
          await processTextNodeWithAutoTranslate(mutation.target);
        }

        // Process attribute changes
        if (
          mutation.type === "attributes" &&
          mutation.target.nodeType === Node.ELEMENT_NODE
        ) {
          await processElementAttributesWithAutoTranslate(mutation.target);
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: false,
      attributes: true,
      attributeFilter: [
        "placeholder",
        "aria-label",
        "aria-placeholder",
        "title",
        "alt",
        "label",
        "data-tooltip",
        "value",
      ],
    });

    return observer;
  }

  /**
   * Set up mutation observer to handle dynamic content
   */
  function setupObserver() {
    if (!translationEnabled) {
      return null;
    }

    // Stop existing observer if any
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(function (mutations) {
      if (!translationEnabled) {
        return;
      }

      mutations.forEach(function (mutation) {
        // Process added nodes
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          }
        });

        // Process modified text content
        if (
          mutation.type === "characterData" &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          // Remove from processed set to allow re-processing
          processedNodes.delete(mutation.target);
          processTextNode(mutation.target);
        }

        // Process attribute changes
        if (
          mutation.type === "attributes" &&
          mutation.target.nodeType === Node.ELEMENT_NODE
        ) {
          processElementAttributes(mutation.target);
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: false,
      attributes: true,
      attributeFilter: [
        "placeholder",
        "aria-label",
        "aria-placeholder",
        "title",
        "alt",
        "label",
        "data-tooltip",
      ],
    });

    return observer;
  }

  /**
   * Start translation
   */
  async function startTranslation() {
    const shouldTranslate = await checkTranslationStatus();

    if (shouldTranslate && document.body) {
      await processPage();
      setupObserver();
      console.log(
        "Belarusian Łacinka Converter: Translation enabled on",
        getCurrentDomain(),
        autoTranslateEnabled ? "(with auto-translate)" : ""
      );
    }
  }

  /**
   * Stop translation
   */
  function stopTranslation() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    translationEnabled = false;
    console.log(
      "Belarusian Łacinka Converter: Translation disabled on",
      getCurrentDomain()
    );
  }

  /**
   * Reload the page
   */
  function reloadPage() {
    window.location.reload();
  }

  /**
   * Initialize the extension
   */
  async function init() {
    // Check translation status
    await checkTranslationStatus();

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startTranslation);
    } else {
      // DOM is already ready
      await startTranslation();
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "enableTranslation") {
        translationEnabled = true;
        reloadPage();
      } else if (request.action === "disableTranslation") {
        stopTranslation();
        reloadPage();
      } else if (request.action === "updateState") {
        extensionEnabled = request.enabled;
        if (!extensionEnabled) {
          stopTranslation();
        } else {
          checkTranslationStatus().then((shouldTranslate) => {
            if (shouldTranslate) {
              startTranslation();
            }
          });
        }
      } else if (request.action === "updateAutoTranslate") {
        autoTranslateEnabled = request.autoTranslate;
        // Clear cache when toggling auto-translate
        if (typeof googleTranslateHelper !== "undefined") {
          googleTranslateHelper.clearCache();
        }
        // Reload to apply changes
        reloadPage();
      }
    });
  }

  // Start the extension
  init();
})();
