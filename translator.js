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
   * Batch translate multiple texts at once
   * Returns array of translated texts in same order as input
   */
  async batchTranslate(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }

    const results = [];
    
    // Filter out empty texts and track indices
    const nonEmptyTexts = [];
    const nonEmptyIndices = [];
    
    texts.forEach((text, index) => {
      if (text && text.trim().length > 0) {
        nonEmptyTexts.push(text);
        nonEmptyIndices.push(index);
      }
    });

    if (nonEmptyTexts.length === 0) {
      return texts;
    }

    // Combine all texts with a unique separator
    const separator = " ◆◇◆ ";
    const combinedText = nonEmptyTexts.join(separator);

    try {
      // Translate combined text
      const translatedCombined = await this.translateToBelarusian(combinedText);
      
      // Split back into individual translations
      const translatedParts = translatedCombined.split(separator);
      
      // Rebuild results array with original order
      for (let i = 0; i < texts.length; i++) {
        if (!texts[i] || texts[i].trim().length === 0) {
          results[i] = texts[i];
        } else {
          const nonEmptyIndex = nonEmptyIndices.indexOf(i);
          results[i] = translatedParts[nonEmptyIndex] || texts[i];
        }
      }
      
      return results;
    } catch (e) {
      console.error("Łacinka: Batch translation failed", e);
      return texts; // Return original texts on failure
    }
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
