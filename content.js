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
        enabledSites: [],
      });

      extensionEnabled = result.enabled;
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
   * Process a single text node
   */
  function processTextNode(node) {
    if (
      !translationEnabled ||
      !node ||
      !node.nodeValue ||
      processedNodes.has(node)
    ) {
      return;
    }

    const originalText = node.nodeValue;

    // Check if the text contains Belarusian characters
    if (belarusianTransliterator.isBelarusian(originalText)) {
      const transliteratedText =
        belarusianTransliterator.transliterate(originalText);

      if (transliteratedText !== originalText) {
        node.nodeValue = transliteratedText;
        processedNodes.add(node);
      }
    }
  }

  /**
   * Process element attributes that contain text
   */
  function processElementAttributes(element) {
    if (!element || !element.getAttribute) {
      return;
    }

    // Attributes that commonly contain visible text
    const textAttributes = [
      "placeholder",
      "aria-label",
      "aria-placeholder",
      "title",
      "alt",
      "label",
      "data-tooltip",
    ];

    textAttributes.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (value && belarusianTransliterator.isBelarusian(value)) {
        const transliteratedValue =
          belarusianTransliterator.transliterate(value);
        if (transliteratedValue !== value) {
          element.setAttribute(attr, transliteratedValue);
        }
      }
    });

    // Special handling for input/textarea values (but not while user is typing)
    if (
      (element.tagName === "INPUT" || element.tagName === "TEXTAREA") &&
      element !== document.activeElement
    ) {
      const value = element.value;
      if (value && belarusianTransliterator.isBelarusian(value)) {
        const transliteratedValue =
          belarusianTransliterator.transliterate(value);
        if (transliteratedValue !== value) {
          element.value = transliteratedValue;
        }
      }
    }
  }

  /**
   * Recursively process all text nodes in an element
   */
  function processElement(element) {
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
      element.querySelectorAll("*").forEach((child) => {
        processElementAttributes(child);
      });
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
    nodesToProcess.forEach((node) => processTextNode(node));

    processedNodes.add(element);
  }

  /**
   * Process the entire page
   */
  function processPage() {
    processElement(document.body);
  }

  /**
   * Set up mutation observer to handle dynamic content
   */
  function setupObserver() {
    const observer = new MutationObserver(function (mutations) {
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
        "value",
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
      processPage();
      setupObserver();
      console.log(
        "Belarusian Łacinka Converter: Translation enabled on",
        getCurrentDomain()
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
      }
    });
  }

  // Start the extension
  init();
})();
