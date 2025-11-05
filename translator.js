/**
 * Google Translate Integration Helper
 * Uses Google Translate to translate text to Belarusian
 */

class GoogleTranslateHelper {
  constructor() {
    this.apiUrl = "https://translate.googleapis.com/translate_a/single";
    this.cache = new Map();
    this.storageKey = "lacinka_translation_cache";
    this.maxStorageSize = 10 * 1024 * 1024; // 10 MB in bytes
    this.initialized = false;
  }

  /**
   * Initialize cache from chrome.storage.local
   */
  async initCache() {
    if (this.initialized) return;

    try {
      const result = await chrome.storage.local.get(this.storageKey);
      if (result[this.storageKey]) {
        const cached = JSON.parse(result[this.storageKey]);
        this.cache = new Map(cached);
        console.log(`Łacinka: Loaded ${this.cache.size} cached translations`);
      }
    } catch (e) {
      console.error("Łacinka: Failed to load cache", e);
    }

    this.initialized = true;
  }

  /**
   * Save cache to chrome.storage.local with size limit
   */
  async saveCache() {
    try {
      const cacheArray = Array.from(this.cache.entries());
      const cacheString = JSON.stringify(cacheArray);
      const sizeInBytes = new Blob([cacheString]).size;

      // If cache exceeds max size, remove oldest entries (from start)
      if (sizeInBytes > this.maxStorageSize) {
        console.log(
          `Łacinka: Cache size ${(sizeInBytes / 1024 / 1024).toFixed(
            2
          )}MB exceeds limit, trimming...`
        );

        // Remove entries from the start until we're under the limit
        while (this.cache.size > 0) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);

          const newCacheArray = Array.from(this.cache.entries());
          const newCacheString = JSON.stringify(newCacheArray);
          const newSize = new Blob([newCacheString]).size;

          if (newSize <= this.maxStorageSize * 0.9) {
            // Keep it at 90% to have some buffer
            console.log(
              `Łacinka: Cache trimmed to ${this.cache.size} entries (${(
                newSize /
                1024 /
                1024
              ).toFixed(2)}MB)`
            );
            break;
          }
        }
      }

      // Save to storage
      await chrome.storage.local.set({
        [this.storageKey]: JSON.stringify(Array.from(this.cache.entries())),
      });
    } catch (e) {
      console.error("Łacinka: Failed to save cache", e);
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text) {
    if (!text || text.length < 3) return null;

    try {
      const params = new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "be",
        dt: "t",
        q: text.substring(0, 500), // Use first 500 chars for detection
      });

      const response = await fetch(`${this.apiUrl}?${params}`);
      const data = await response.json();

      // Google Translate returns detected language in data[2]
      if (data && data[2]) {
        return data[2];
      }

      return null;
    } catch (e) {
      console.error("Łacinka: Language detection failed", e);
      return null;
    }
  }

  /**
   * Translate text to Belarusian
   */
  async translateToBelarusian(text) {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Initialize cache if not done yet
    await this.initCache();

    // Check cache
    const cacheKey = text.substring(0, 100);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "be", // Belarusian
        dt: "t",
        q: text,
      });

      const response = await fetch(`${this.apiUrl}?${params}`);
      const data = await response.json();

      // Google Translate returns translated text in data[0][0][0]
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translated = data[0].map((item) => item[0]).join("");

        // Cache result
        this.cache.set(cacheKey, translated);

        // Save cache periodically (every 10 new entries)
        if (this.cache.size % 10 === 0) {
          await this.saveCache();
        }

        return translated;
      }

      return text; // Return original if translation fails
    } catch (e) {
      console.error("Łacinka: Translation failed", e);
      return text;
    }
  }

  /**
   * Check if text is already in Belarusian
   */
  isBelarusian(text) {
    // Check for Belarusian-specific characters
    const belarusianChars = /[ўіёІЎЁ]/;
    return belarusianChars.test(text);
  }

  /**
   * Translate text to Belarusian if needed
   */
  async translateIfNeeded(text) {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Skip if already contains Belarusian characters
    if (this.isBelarusian(text)) {
      return text;
    }

    // Skip very short texts
    if (text.trim().length < 3) {
      return text;
    }

    // Detect if text is Cyrillic but not Belarusian
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(text);

    if (hasCyrillic) {
      // Translate to Belarusian
      return await this.translateToBelarusian(text);
    }

    // For non-Cyrillic text, translate it
    return await this.translateToBelarusian(text);
  }

  /**
   * Batch translate multiple texts at once (withing to avoid URL length limits)
   * Returns array of translated texts in same order as input
   * @param {Array} texts - Array of texts to translate
   * @param {Function} onProgress - Optional callback for progress updates (currentChunk, totalChunks)
   */
  async batchTranslate(texts, onProgress = null) {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Initialize cache
    await this.initCache();

    const results = new Array(texts.length);
    const separator = " ◆◇◆ ";
    const maxChunkSymbols = 2000; // Maximum 2000 symbols per chunk

    // Filter out empty texts and track indices
    const nonEmptyData = [];
    texts.forEach((text, index) => {
      if (text && text.trim().length > 0) {
        nonEmptyData.push({ text, index });
      } else {
        results[index] = text; // Keep empty texts as-is
      }
    });

    if (nonEmptyData.length === 0) {
      return texts;
    }

    // Split into chunks based on symbol count
    const chunks = [];
    let currentChunk = [];
    let currentSymbolCount = 0;

    for (const item of nonEmptyData) {
      const itemSymbolCount = item.text.length + separator.length;

      // Start new chunk if adding this item would exceed 2000 symbols
      if (
        currentChunk.length > 0 &&
        currentSymbolCount + itemSymbolCount > maxChunkSymbols
      ) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSymbolCount = 0;
      }

      currentChunk.push(item);
      currentSymbolCount += itemSymbolCount;
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    console.log(
      `Łacinka: Starting batch translation - ${chunks.length} chunks, ${nonEmptyData.length} texts total`
    );

    // Process each chunk with progress reporting
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const combinedText = chunk.map((item) => item.text).join(separator);

      try {
        // Translate combined text
        const translatedCombined = await this.translateToBelarusian(
          combinedText
        );

        // Split back into individual translations
        const translatedParts = translatedCombined.split(separator);

        // Map results back to original indices
        chunk.forEach((item, i) => {
          results[item.index] = translatedParts[i] || item.text;
        });

        const progress = Math.round(((chunkIndex + 1) / chunks.length) * 100);
        console.log(
          `Łacinka: Translated chunk ${chunkIndex + 1}/${chunks.length} (${
            chunk.length
          } texts) - ${progress}% complete`
        );

        // Call progress callback if provided
        if (onProgress) {
          onProgress(chunkIndex + 1, chunks.length, progress);
        }
      } catch (e) {
        console.error(`Łacinka: Chunk ${chunkIndex + 1} translation failed`, e);
        // On failure, keep original texts
        chunk.forEach((item) => {
          results[item.index] = item.text;
        });
      }
    }

    return results;
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Make it available globally
const googleTranslateHelper = new GoogleTranslateHelper();
