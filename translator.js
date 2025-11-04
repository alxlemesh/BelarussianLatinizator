/**
 * Google Translate Integration Helper
 * Uses Google Translate to translate text to Belarusian
 */

class GoogleTranslateHelper {
  constructor() {
    this.apiUrl = "https://translate.googleapis.com/translate_a/single";
    this.cache = new Map();
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

        // Limit cache size
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
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
   * Batch translate multiple texts at once (with chunking to avoid URL length limits)
   * Returns array of translated texts in same order as input
   */
  async batchTranslate(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }

    const results = new Array(texts.length);
    const separator = " ◆◇◆ ";
    const maxUrlLength = 6000; // Safe limit for URL length (Google allows ~8KB)
    const maxChunkSize = 50; // Maximum texts per chunk

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

    // Split into chunks based on URL length and count
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const item of nonEmptyData) {
      const itemLength =
        encodeURIComponent(item.text).length + separator.length;

      // Start new chunk if adding this item would exceed limits
      if (
        currentChunk.length > 0 &&
        (currentLength + itemLength > maxUrlLength ||
          currentChunk.length >= maxChunkSize)
      ) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }

      currentChunk.push(item);
      currentLength += itemLength;
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // Process each chunk
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

        console.log(
          `Łacinka: Translated chunk ${chunkIndex + 1}/${chunks.length} (${
            chunk.length
          } texts)`
        );
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
