/**
 * Popup UI Controller for Belarusian Łacinka Converter
 */

// Translations
const translations = {
  "be-latn": {
    appTitle: "Łacinka Kanvertar",
    appSubtitle: "Biełaruskaja kirylica ŭ łacinkę",
    extensionEnabled: "Pašyreńnie ŭklučanaje",
    autoTranslate: "Aŭtamatyčny pierakład na biełaruskuju (Beta)",
    autoTranslateHint:
      "Pierakladaje niebiełaruski tekst na biełaruskuju praz Google Translate, a potym kanvertuje ŭ łacinkę",
    currentSite: "Dziejny sajt",
    loading: "Zahruzka...",
    enableTranslation: "Uklučyć pierakład",
    disableTranslation: "Vyklučyć pierakład",
    translationEnabled: "✓ Pierakład uklučany",
    enabledSites: "Uklučanyja sajty",
    noSitesEnabled: "Nijakix sajtaŭ jašče nie ŭklučana",
    actions: "Dziejańni",
    refreshPage: "Abnavić staronku",
    clearAllSites: "Ačyścić usie sajty",
    remove: "Vydalić",
    confirmClear: "Vy ŭpeŭnienyja, što chočacie vydalić usie ŭklučanyja sajty?",
    invalidUrl: "Niekarektnaja URL-adresa",
  },
  be: {
    appTitle: "Łacinka Канвертар",
    appSubtitle: "Беларуская кірыліца ў łacinkę",
    extensionEnabled: "Пашырэнне ўключанае",
    autoTranslate: "Аўтаматычны пераклад на беларускую (Beta)",
    autoTranslateHint:
      "Перакладае небеларускі тэкст на беларускую праз Google Translate, а потым канвертуе ў łacinkę",
    currentSite: "Дзейны сайт",
    loading: "Загрузка...",
    enableTranslation: "Уключыць пераклад",
    disableTranslation: "Выключыць пераклад",
    translationEnabled: "✓ Пераклад уключаны",
    enabledSites: "Уключаныя сайты",
    noSitesEnabled: "Нiякiх сайтаў яшчэ не ўключана",
    actions: "Дзеянні",
    refreshPage: "Абнавіць старонку",
    clearAllSites: "Ачысціць усе сайты",
    remove: "Выдаліць",
    confirmClear: "Вы ўпэўненыя, што хочаце выдаліць усе ўключаныя сайты?",
    invalidUrl: "Некарэктная URL-адраса",
  },
  en: {
    appTitle: "Łacinka Converter",
    appSubtitle: "Belarusian Cyrillic to Latin",
    extensionEnabled: "Extension Enabled",
    autoTranslate: "Auto-translate to Belarusian (Beta)",
    autoTranslateHint:
      "Translates non-Belarusian text to Belarusian using Google Translate, then converts to Łacinka",
    currentSite: "Current Site",
    loading: "Loading...",
    enableTranslation: "Enable Translation",
    disableTranslation: "Disable Translation",
    translationEnabled: "✓ Translation Enabled",
    enabledSites: "Enabled Sites",
    noSitesEnabled: "No sites enabled yet",
    actions: "Actions",
    refreshPage: "Refresh Page",
    clearAllSites: "Clear All Sites",
    remove: "Remove",
    confirmClear: "Are you sure you want to remove all enabled sites?",
    invalidUrl: "Invalid URL",
  },
};

// DOM Elements
const globalToggle = document.getElementById("globalToggle");
const autoTranslateToggle = document.getElementById("autoTranslateToggle");
const currentUrlEl = document.getElementById("currentUrl");
const enableSiteBtn = document.getElementById("enableSite");
const disableSiteBtn = document.getElementById("disableSite");
const enabledSitesList = document.getElementById("enabledSitesList");
const refreshPageBtn = document.getElementById("refreshPage");
const clearAllSitesBtn = document.getElementById("clearAllSites");

let currentTab = null;
let currentDomain = null;
let currentLanguage = "be-latn";

/**
 * Set current language
 */
async function setLanguage(lang) {
  currentLanguage = lang;

  // Save to storage
  await chrome.storage.sync.set({ uiLanguage: lang });

  // Update language buttons UI
  updateLanguageUI();

  // Update all translated elements with data-i18n attributes
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });

  // Reload settings and update dynamic content
  const settings = await loadSettings();

  // Update current URL display if needed
  if (currentDomain) {
    // Keep the domain name as is
    const isSiteEnabled = settings.enabledSites.includes(currentDomain);
    if (isSiteEnabled) {
      enableSiteBtn.textContent =
        translations[currentLanguage].translationEnabled;
    } else {
      enableSiteBtn.textContent =
        translations[currentLanguage].enableTranslation;
    }
  } else if (currentTab && currentTab.url) {
    // If we couldn't get domain, show invalid URL message
    currentUrlEl.textContent = translations[currentLanguage].invalidUrl;
  } else {
    // If no tab loaded yet, show loading message
    currentUrlEl.textContent = translations[currentLanguage].loading;
  }

  // Update sites list with new language
  updateSitesList(settings.enabledSites);
}

/**
 * Update language buttons UI
 */
function updateLanguageUI() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-lang") === currentLanguage) {
      btn.classList.add("active");
    }
  });
}

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
    autoTranslate: false,
    enabledSites: [],
    uiLanguage: "be-latn",
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

  // Set language
  currentLanguage = settings.uiLanguage || "be-latn";
  setLanguage(currentLanguage);

  // Update global toggle
  globalToggle.checked = settings.enabled;

  // Update auto-translate toggle
  autoTranslateToggle.checked = settings.autoTranslate;
  autoTranslateToggle.disabled = !settings.enabled;

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
        enableSiteBtn.textContent =
          translations[currentLanguage].translationEnabled;
      } else {
        enableSiteBtn.textContent =
          translations[currentLanguage].enableTranslation;
      }
    } else {
      currentUrlEl.textContent = translations[currentLanguage].invalidUrl;
      enableSiteBtn.disabled = true;
      disableSiteBtn.disabled = true;
    }
  } else {
    currentUrlEl.textContent = translations[currentLanguage].loading;
  }

  // Update enabled sites list
  updateSitesList(settings.enabledSites);
}

/**
 * Update the list of enabled sites
 */
function updateSitesList(enabledSites) {
  if (!enabledSites || enabledSites.length === 0) {
    enabledSitesList.innerHTML = `<p class="empty-state">${translations[currentLanguage].noSitesEnabled}</p>`;
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
    removeBtn.textContent = translations[currentLanguage].remove;
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
 * Toggle auto-translate feature
 */
async function toggleAutoTranslate() {
  const settings = await loadSettings();
  settings.autoTranslate = autoTranslateToggle.checked;
  await saveSettings(settings);

  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    chrome.tabs
      .sendMessage(tab.id, {
        action: "updateAutoTranslate",
        autoTranslate: settings.autoTranslate,
      })
      .catch(() => {});
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
  if (confirm(translations[currentLanguage].confirmClear)) {
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
autoTranslateToggle.addEventListener("change", toggleAutoTranslate);
enableSiteBtn.addEventListener("click", enableCurrentSite);
disableSiteBtn.addEventListener("click", disableCurrentSite);
refreshPageBtn.addEventListener("click", refreshCurrentPage);
clearAllSitesBtn.addEventListener("click", clearAllSites);

// Language selector event listeners
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const lang = btn.getAttribute("data-lang");
    await setLanguage(lang);
  });
});

// Initialize UI when popup opens
document.addEventListener("DOMContentLoaded", updateUI);
