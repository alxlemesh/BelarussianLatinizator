/**
 * Belarusian Cyrillic to Łacinka (Latin) transliteration
 * Based on the classical Belarusian Latin alphabet (Łacinka)
 * Following official classical orthography rules
 *
 * Key rules:
 * - г → h (voiced glottal fricative /ɦ/)
 * - ґ → g (voiced velar plosive /g/, rare in modern Belarusian)
 * - е → je (at word start/after vowel/ъ/ь), ie (after consonant)
 * - ё → jo (always)
 * - э → e (pure e sound)
 * - л → l (soft, before я/е/і/ё/ю/ь), ł (hard, before а/о/у/ы/э or consonants)
 */ class BelarusianTransliterator {
  constructor() {
    // Basic character mapping (without contextual rules)
    this.baseCharMap = {
      // Uppercase
      А: "A",
      Б: "B",
      В: "V",
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
      в: "v",
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
    this.belarusianIndicators = ["ў", "Ў", "і", "І", "ё", "Ё"];
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
   * Check if text contains Belarusian-specific characters
   */
  isBelarusian(text) {
    if (!text || typeof text !== "string") return false;

    // Check for specific Belarusian characters
    for (let char of this.belarusianIndicators) {
      if (text.includes(char)) {
        return true;
      }
    }

    // Additional check: if text has Cyrillic and reasonable length
    const cyrillicCount = (text.match(/[а-яА-ЯёЁ]/g) || []).length;
    return cyrillicCount > 3; // At least a few Cyrillic characters
  }

  /**
   * Transliterate Belarusian Cyrillic text to Łacinka
   */
  transliterate(text) {
    if (!text || typeof text !== "string") return text;

    let result = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = i < text.length - 1 ? text[i + 1] : null;
      const prevChar = i > 0 ? text[i - 1] : null;
      const isStart = this.isWordStart(text, i);

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

      // Handle Ё/ё - always jo
      if (char === "Ё" || char === "ё") {
        const isUpper = char === "Ё";
        result += isUpper ? "Jo" : "jo";
        continue;
      }

      // Handle Ю/ю with contextual rules
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
          // After consonant: u
          result += isUpper ? "U" : "u";
        }
        continue;
      }

      // Handle Я/я with contextual rules
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
          // After consonant: a
          result += isUpper ? "A" : "a";
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
