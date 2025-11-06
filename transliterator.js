/**
 * Belarusian Cyrillic to Łacinka (Latin) transliteration
 * Based on the classical Belarusian Latin alphabet (Łacinka)
 * Following official classical orthography rules
 *
 * Key rules:
 * - г → h (voiced glottal fricative /ɦ/)
 * - ґ → g (voiced velar plosive /g/, rare in modern Belarusian)
 * - в → v (at word start/after consonant/at morpheme boundary - consonant [v])
 * - в → w (after vowel, intervocalic - semivowel [w]/[u̯])
 * - е → je (at word start/after vowel/ъ/ь), ie (after consonant)
 * - ё → jo (at word start/after vowel), io (after consonant - shows palatalization)
 * - ю → ju (at word start/after vowel), iu (after consonant - shows palatalization)
 * - я → ja (at word start/after vowel), ia (after consonant - shows palatalization)
 * - э → e (pure e sound)
 * - л → l (soft, before я/е/і/ё/ю/ь), ł (hard, before а/о/у/ы/э or consonants)
 */ class BelarusianTransliterator {
  constructor() {
    // Basic character mapping (without contextual rules)
    this.baseCharMap = {
      // Uppercase
      А: "A",
      Б: "B",
      Г: "H",
      Ґ: "G",
      Д: "D",
      Ж: "Ž",
      І: "I",
      Й: "J",
      К: "K",
      М: "M",
      О: "O",
      П: "P",
      Р: "R",
      Т: "T",
      У: "U",
      Ў: "Ŭ",
      Ф: "F",
      Х: "Ch",
      Ч: "Č",
      Ш: "Š",
      Ы: "Y",
      Э: "E",
      Ъ: "",
      "'": "",

      // Lowercase
      а: "a",
      б: "b",
      г: "h",
      ґ: "g",
      д: "d",
      ж: "ž",
      і: "i",
      й: "j",
      к: "k",
      м: "m",
      о: "o",
      п: "p",
      р: "r",
      т: "t",
      у: "u",
      ў: "ŭ",
      ф: "f",
      х: "ch",
      ч: "č",
      ш: "š",
      ы: "y",
      э: "e",
      ъ: "",
      "'": "",
    };

    // Belarusian-specific characters that indicate Belarusian text
    this.belarusianIndicators = ["ў", "Ў", "і", "І"];

    // Non-Belarusian Cyrillic characters (Russian/Ukrainian/Serbian/Macedonian specific)
    // Russian: и, ы, э, ъ
    // Ukrainian: ґ, є, ї, и
    // Serbian: ћ, џ, ђ
    // Macedonian: ќ, ѓ, ѕ
    this.nonBelarusianCyrillic = [
      "и",
      "И", // Russian/Ukrainian и (Belarusian uses і)
      "ы",
      "Ы", // Russian ы (Belarusian has this but in context with и it's likely Russian)
      "ъ",
      "Ъ", // Hard sign (Russian/Bulgarian)
      "є",
      "Є", // Ukrainian є
      "ї",
      "Ї", // Ukrainian ї
      "ґ",
      "Ґ", // Ukrainian ґ (very rare in Belarusian, usually indicates Ukrainian)
      "ћ",
      "Ћ", // Serbian ћ
      "џ",
      "Џ", // Serbian џ
      "ђ",
      "Ђ", // Serbian ђ
      "ќ",
      "Ќ", // Macedonian ќ
      "ѓ",
      "Ѓ", // Macedonian ѓ
      "ѕ",
      "Ѕ", // Macedonian ѕ
    ];
  }

  /**
   * Check if position is at a likely morpheme boundary (prefix-root)
   * Common Belarusian prefixes: пра-, пры-, за-, на-, раз-, без-, etc.
   */
  isMorphemeBoundary(text, index) {
    if (index < 2) return false;

    // Check for common 3-letter prefixes before в
    const prefix3 = text.substring(index - 3, index).toLowerCase();
    const commonPrefixes3 = ["пра", "пры", "раз", "роз", "без"];
    if (commonPrefixes3.includes(prefix3)) {
      return true;
    }

    // Check for common 2-letter prefixes before в
    if (index >= 2) {
      const prefix2 = text.substring(index - 2, index).toLowerCase();
      const commonPrefixes2 = ["за", "на", "па", "да", "ад", "аб"];
      if (commonPrefixes2.includes(prefix2)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if character is a Cyrillic vowel
   */
  isCyrillicVowel(char) {
    if (!char) return false;
    const vowels = "аеёіоуыэюяАЕЁІОУЫЭЮЯ";
    return vowels.includes(char);
  }

  /**
   * Check if character is a Cyrillic consonant
   */
  isCyrillicConsonant(char) {
    if (!char) return false;
    const consonants = "бвгґджзйклмнпрстфхцчшьБВГҐДЖЗЙКЛМНПРСТФХЦЧШЬ";
    return consonants.includes(char);
  }

  /**
   * Check if character is at the beginning of a word
   */
  isWordStart(text, index) {
    if (index === 0) return true;
    const prevChar = text[index - 1];
    // Word starts after space, punctuation, or at the beginning
    return /[\s\-—–.,!?;:()[\]{}\"'«»]/.test(prevChar);
  }

  /**
   * Check if text contains non-Belarusian Cyrillic characters
   */
  hasNonBelarusianCyrillic(text) {
    if (!text || typeof text !== "string") return false;

    for (let char of this.nonBelarusianCyrillic) {
      if (text.includes(char)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if text contains Belarusian-specific characters
   */
  isBelarusian(text) {
    if (!text || typeof text !== "string") return false;

    // If contains non-Belarusian Cyrillic, it's NOT Belarusian
    if (this.hasNonBelarusianCyrillic(text)) {
      return false;
    }

    // Check for specific Belarusian characters
    for (let char of this.belarusianIndicators) {
      if (text.includes(char)) {
        return true;
      }
    }

    // Additional check: if text has Cyrillic and reasonable length
    // But no non-Belarusian characters
    const cyrillicCount = (text.match(/[а-яА-ЯёЁ]/g) || []).length;
    return cyrillicCount > 3; // At least a few Cyrillic characters
  }

  /**
   * Check if text needs translation (contains non-Belarusian Cyrillic)
   */
  needsTranslation(text) {
    if (!text || typeof text !== "string") return false;

    // Check if it has non-Belarusian Cyrillic characters
    const hasNonBelarusian = this.hasNonBelarusianCyrillic(text);

    // If it has non-Belarusian Cyrillic, it needs translation
    // (unless it's already been translated and has no Cyrillic left)
    if (hasNonBelarusian) {
      return true;
    }

    return false;
  }

  /**
   * Transliterate Belarusian Cyrillic text to Łacinka
   */
  transliterate(text, forceTransliterate = false) {
    if (!text || typeof text !== "string") return text;

    // CRITICAL: Do not transliterate if text contains non-Belarusian Cyrillic
    // This prevents mixed Latin-Cyrillic output like "Pиrotiechnиčieskaja"
    // UNLESS forceTransliterate is true (used after auto-translation)
    if (!forceTransliterate && this.hasNonBelarusianCyrillic(text)) {
      return text; // Return original text unchanged
    }

    let result = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = i < text.length - 1 ? text[i + 1] : null;
      const prevChar = i > 0 ? text[i - 1] : null;
      const isStart = this.isWordStart(text, i);

      // Handle В/в with contextual rules
      // v: at beginning of syllable or before vowels (consonant [v])
      // w: after vowel when NOT before another vowel or at morpheme boundary
      if (char === "В" || char === "в") {
        const isUpper = char === "В";
        const atMorphemeBoundary = this.isMorphemeBoundary(text, i);

        // Use 'v' when в acts as a consonant:
        // 1. At word start, OR
        // 2. After a consonant (beginning of syllable), OR
        // 3. At morpheme boundary (prefix-root), OR
        // 4. Before a vowel when also at word start/after consonant/at boundary
        if (
          isStart ||
          (prevChar && this.isCyrillicConsonant(prevChar)) ||
          atMorphemeBoundary
        ) {
          result += isUpper ? "V" : "v";
        } else if (nextChar && this.isCyrillicVowel(nextChar)) {
          // After vowel but before another vowel: semivowel w
          result += isUpper ? "W" : "w";
        } else {
          // After vowel at end or before consonant: w
          result += isUpper ? "W" : "w";
        }
        continue;
      }

      // Handle Л/л with special rules based on following vowel
      if (char === "Л" || char === "л") {
        const isUpper = char === "Л";

        // Soft vowels that make L soft: я, е, і, ё, ю, ь
        const softVowels = "яеіёюЯЕІЁЮьЬ";

        // Check if followed by soft vowel or soft sign
        if (nextChar && softVowels.includes(nextChar)) {
          result += isUpper ? "L" : "l";
          // Don't skip the next character unless it's ь
          if (nextChar === "ь" || nextChar === "Ь") {
            i++; // Skip the soft sign
          }
          continue;
        }

        // Otherwise it's hard L → ł
        // (before а, о, у, ы, э, consonants, or end of word)
        result += isUpper ? "Ł" : "ł";
        continue;
      }

      // Handle Е/е with contextual rules
      if (char === "Е" || char === "е") {
        const isUpper = char === "Е";
        if (
          isStart ||
          this.isCyrillicVowel(prevChar) ||
          prevChar === "ь" ||
          prevChar === "Ь" ||
          prevChar === "'" ||
          prevChar === "'"
        ) {
          // At word start or after vowel or soft sign: Je/je
          result += isUpper ? "Je" : "je";
        } else {
          // After consonant: ie
          result += isUpper ? "Ie" : "ie";
        }
        continue;
      }

      // Handle Ё/ё with contextual rules
      // io: after consonants (shows palatalization)
      // jo: at word start or after vowels
      if (char === "Ё" || char === "ё") {
        const isUpper = char === "Ё";
        if (
          isStart ||
          this.isCyrillicVowel(prevChar) ||
          prevChar === "ь" ||
          prevChar === "Ь" ||
          prevChar === "'" ||
          prevChar === "'"
        ) {
          // At word start or after vowel or soft sign: Jo/jo
          result += isUpper ? "Jo" : "jo";
        } else {
          // After consonant: io (shows palatalization)
          result += isUpper ? "IO" : "io";
        }
        continue;
      }

      // Handle Ю/ю with contextual rules
      // iu: after consonants (shows palatalization)
      // ju: at word start or after vowels
      if (char === "Ю" || char === "ю") {
        const isUpper = char === "Ю";
        if (
          isStart ||
          this.isCyrillicVowel(prevChar) ||
          prevChar === "ь" ||
          prevChar === "Ь" ||
          prevChar === "'" ||
          prevChar === "'"
        ) {
          // At word start or after vowel or soft sign: Ju/ju
          result += isUpper ? "Ju" : "ju";
        } else {
          // After consonant: iu (shows palatalization)
          result += isUpper ? "IU" : "iu";
        }
        continue;
      }

      // Handle Я/я with contextual rules
      // ia: after consonants (shows palatalization)
      // ja: at word start or after vowels
      if (char === "Я" || char === "я") {
        const isUpper = char === "Я";
        if (
          isStart ||
          this.isCyrillicVowel(prevChar) ||
          prevChar === "ь" ||
          prevChar === "Ь" ||
          prevChar === "'" ||
          prevChar === "'"
        ) {
          // At word start or after vowel or soft sign: Ja/ja
          result += isUpper ? "Ja" : "ja";
        } else {
          // After consonant: ia (shows palatalization)
          result += isUpper ? "IA" : "ia";
        }
        continue;
      }

      // Handle consonants with soft sign (palatalization)
      if (nextChar === "ь" || nextChar === "Ь") {
        // З/з + ь = Ź/ź
        if (char === "З" || char === "з") {
          result += char === "З" ? "Ź" : "ź";
          i++; // Skip the soft sign
          continue;
        }
        // Н/н + ь = Ń/ń
        if (char === "Н" || char === "н") {
          result += char === "Н" ? "Ń" : "ń";
          i++; // Skip the soft sign
          continue;
        }
        // С/с + ь = Ś/ś
        if (char === "С" || char === "с") {
          result += char === "С" ? "Ś" : "ś";
          i++; // Skip the soft sign
          continue;
        }
        // Ц/ц + ь = Ć/ć
        if (char === "Ц" || char === "ц") {
          result += char === "Ц" ? "Ć" : "ć";
          i++; // Skip the soft sign
          continue;
        }
        // Л already handled above
      }

      // Handle regular З/з (without soft sign) = Z/z
      if (char === "З" || char === "з") {
        result += char === "З" ? "Z" : "z";
        continue;
      }

      // Handle regular Н/н (without soft sign) = N/n
      if (char === "Н" || char === "н") {
        result += char === "Н" ? "N" : "n";
        continue;
      }

      // Handle regular С/с (without soft sign) = S/s
      if (char === "С" || char === "с") {
        result += char === "С" ? "S" : "s";
        continue;
      }

      // Handle regular Ц/ц (without soft sign) = C/c
      if (char === "Ц" || char === "ц") {
        result += char === "Ц" ? "C" : "c";
        continue;
      }

      // Skip standalone soft sign
      if (char === "ь" || char === "Ь") {
        continue;
      }

      // Use base character map for remaining characters
      if (this.baseCharMap.hasOwnProperty(char)) {
        result += this.baseCharMap[char];
      } else {
        result += char;
      }
    }

    return result;
  }

  /**
   * Convert text to Łacinka if it's Belarusian
   */
  convertIfBelarusian(text) {
    if (this.isBelarusian(text)) {
      return this.transliterate(text);
    }
    return text;
  }
}

// Make it available globally
const belarusianTransliterator = new BelarusianTransliterator();
