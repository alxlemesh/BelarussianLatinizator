/**
 * Background Service Worker for Belarusian Łacinka Converter
 */

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    {
      enabled: true,
      enabledSites: [],
    },
    (result) => {
      // Set defaults if not already set
      chrome.storage.sync.set({
        enabled: result.enabled,
        enabledSites: result.enabledSites,
      });
    }
  );

  console.log("Belarusian Łacinka Converter installed");
});

// Listen for storage changes and notify tabs
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    // Notify all tabs about the change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            action: "storageChanged",
            changes: changes,
          })
          .catch(() => {
            // Ignore errors for tabs without content script
          });
      });
    });
  }
});

// Update badge based on extension state
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.enabled) {
    updateBadge(changes.enabled.newValue);
  }
});

// Update badge text
function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#999999" });
  }
}

// Set initial badge state
chrome.storage.sync.get({ enabled: true }, (result) => {
  updateBadge(result.enabled);
});
