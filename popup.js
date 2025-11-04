/**
 * Popup UI Controller for Belarusian Łacinka Converter
 */

// DOM Elements
const globalToggle = document.getElementById("globalToggle");
const currentUrlEl = document.getElementById("currentUrl");
const enableSiteBtn = document.getElementById("enableSite");
const disableSiteBtn = document.getElementById("disableSite");
const enabledSitesList = document.getElementById("enabledSitesList");
const refreshPageBtn = document.getElementById("refreshPage");
const clearAllSitesBtn = document.getElementById("clearAllSites");

let currentTab = null;
let currentDomain = null;

/**
 * Get the domain from a URL
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Load saved settings from storage
 */
async function loadSettings() {
  const result = await chrome.storage.sync.get({
    enabled: true,
    enabledSites: [],
  });
  return result;
}

/**
 * Save settings to storage
 */
async function saveSettings(settings) {
  await chrome.storage.sync.set(settings);
}

/**
 * Update UI based on current state
 */
async function updateUI() {
  const settings = await loadSettings();

  // Update global toggle
  globalToggle.checked = settings.enabled;

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (currentTab && currentTab.url) {
    currentDomain = getDomain(currentTab.url);

    if (currentDomain) {
      currentUrlEl.textContent = currentDomain;

      const isSiteEnabled = settings.enabledSites.includes(currentDomain);

      // Update button states
      enableSiteBtn.disabled = isSiteEnabled || !settings.enabled;
      disableSiteBtn.disabled = !isSiteEnabled || !settings.enabled;

      if (isSiteEnabled) {
        enableSiteBtn.textContent = "✓ Translation Enabled";
      } else {
        enableSiteBtn.textContent = "Enable Translation";
      }
    } else {
      currentUrlEl.textContent = "Invalid URL";
      enableSiteBtn.disabled = true;
      disableSiteBtn.disabled = true;
    }
  }

  // Update enabled sites list
  updateSitesList(settings.enabledSites);
}

/**
 * Update the list of enabled sites
 */
function updateSitesList(enabledSites) {
  if (!enabledSites || enabledSites.length === 0) {
    enabledSitesList.innerHTML =
      '<p class="empty-state">No sites enabled yet</p>';
    return;
  }

  enabledSitesList.innerHTML = "";

  enabledSites.forEach((site) => {
    const siteItem = document.createElement("div");
    siteItem.className = "site-item";

    const domainSpan = document.createElement("span");
    domainSpan.className = "site-item-domain";
    domainSpan.textContent = site;

    const removeBtn = document.createElement("button");
    removeBtn.className = "site-item-remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeSite(site));

    siteItem.appendChild(domainSpan);
    siteItem.appendChild(removeBtn);
    enabledSitesList.appendChild(siteItem);
  });
}

/**
 * Toggle global extension state
 */
async function toggleGlobalState() {
  const settings = await loadSettings();
  settings.enabled = globalToggle.checked;
  await saveSettings(settings);

  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    chrome.tabs
      .sendMessage(tab.id, {
        action: "updateState",
        enabled: settings.enabled,
      })
      .catch(() => {}); // Ignore errors for tabs without content script
  });

  updateUI();
}

/**
 * Enable translation for current site
 */
async function enableCurrentSite() {
  if (!currentDomain) return;

  const settings = await loadSettings();

  if (!settings.enabledSites.includes(currentDomain)) {
    settings.enabledSites.push(currentDomain);
    await saveSettings(settings);

    // Notify current tab
    chrome.tabs
      .sendMessage(currentTab.id, {
        action: "enableTranslation",
      })
      .catch(() => {});

    updateUI();
  }
}

/**
 * Disable translation for current site
 */
async function disableCurrentSite() {
  if (!currentDomain) return;

  await removeSite(currentDomain);
}

/**
 * Remove a site from enabled sites
 */
async function removeSite(domain) {
  const settings = await loadSettings();
  settings.enabledSites = settings.enabledSites.filter(
    (site) => site !== domain
  );
  await saveSettings(settings);

  // Notify all tabs with this domain
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (getDomain(tab.url) === domain) {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "disableTranslation",
        })
        .catch(() => {});
    }
  });

  updateUI();
}

/**
 * Refresh current page
 */
function refreshCurrentPage() {
  if (currentTab) {
    chrome.tabs.reload(currentTab.id);
    window.close();
  }
}

/**
 * Clear all enabled sites
 */
async function clearAllSites() {
  if (confirm("Are you sure you want to remove all enabled sites?")) {
    const settings = await loadSettings();
    settings.enabledSites = [];
    await saveSettings(settings);

    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      chrome.tabs
        .sendMessage(tab.id, {
          action: "disableTranslation",
        })
        .catch(() => {});
    });

    updateUI();
  }
}

// Event Listeners
globalToggle.addEventListener("change", toggleGlobalState);
enableSiteBtn.addEventListener("click", enableCurrentSite);
disableSiteBtn.addEventListener("click", disableCurrentSite);
refreshPageBtn.addEventListener("click", refreshCurrentPage);
clearAllSitesBtn.addEventListener("click", clearAllSites);

// Initialize UI when popup opens
document.addEventListener("DOMContentLoaded", updateUI);
