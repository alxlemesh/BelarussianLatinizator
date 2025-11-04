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
   * Process a single text node with optional auto-translation
   */
  async function processTextNode(node) {
    if (
      !translationEnabled ||
      !node ||
      !node.nodeValue ||
      processedNodes.has(node)
    ) {
      return;
    }

    let textToProcess = node.nodeValue;

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
   * Process element attributes that contain text
   */
  async function processElementAttributes(element) {
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
    await processElementAttributes(element);

    // Process attributes of all child elements
    if (element.querySelectorAll) {
      const children = Array.from(element.querySelectorAll("*"));
      for (const child of children) {
        await processElementAttributes(child);
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
      await processTextNode(node);
    }

    processedNodes.add(element);
  }

  /**
   * Process the entire page
   */
  async function processPage() {
    if (document.body) {
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
            await processTextNode(node);
          }
        }

        // Process modified text content
        if (
          mutation.type === "characterData" &&
          mutation.target.nodeType === Node.TEXT_NODE
        ) {
          // Remove from processed set to allow re-processing
          processedNodes.delete(mutation.target);
          await processTextNode(mutation.target);
        }

        // Process attribute changes
        if (
          mutation.type === "attributes" &&
          mutation.target.nodeType === Node.ELEMENT_NODE
        ) {
          await processElementAttributes(mutation.target);
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
