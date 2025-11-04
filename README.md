# Belarusian Łacinka Converter

A Chrome/Edge browser extension that automatically converts Belarusian Cyrillic text to Łacinka (Latin script) on Google Drive and Google Docs pages.

## Features

- 🔄 Automatic detection of Belarusian text
- ✨ Real-time conversion to Łacinka (Latin alphabet)
- 📄 Works on Google Drive and Google Docs
- ⚡ Handles dynamically loaded content

## Installation

### Chrome/Edge (Developer Mode)

1. **Clone or download this repository** to your local machine

2. **Generate icon files** (optional but recommended):

   - Open `icons/generate-icons.html` in your browser
   - Right-click each canvas image and "Save image as..."
   - Save as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder
   - Or use any image editor to create simple icons

3. **Load the extension in Chrome/Edge**:

   - Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked"
   - Select the `/Users/alexeylemesh/Developer/lacinka` folder
   - The extension should now appear in your extensions list

4. **Test the extension**:
   - Go to Google Drive (https://drive.google.com)
   - Open or create a document with Belarusian Cyrillic text
   - The text should automatically convert to Łacinka

## How It Works

The extension:

1. **Detects Belarusian text** by looking for Belarusian-specific characters (ў, Ў, і, І, ё, Ё)
2. **Transliterates** using the classical Belarusian Łacinka alphabet
3. **Monitors** the page for dynamic content changes using MutationObserver
4. **Converts** only text that appears to be in Belarusian Cyrillic

## Transliteration Table

### Basic Character Mapping

| Cyrillic | Łacinka     | Cyrillic | Łacinka |
| -------- | ----------- | -------- | ------- |
| А, а     | A, a        | Н, н     | N, n    |
| Б, б     | B, b        | О, о     | O, o    |
| В, в     | V, v        | П, п     | P, p    |
| Г, г     | H, h        | Р, р     | R, r    |
| Д, д     | D, d        | С, с     | S, s    |
| Ж, ж     | Ž, ž        | Т, т     | T, t    |
| З, з     | Z, z        | У, у     | U, u    |
| І, і     | I, i        | Ў, ў     | Ŭ, ŭ    |
| Й, й     | J, j        | Ф, ф     | F, f    |
| К, к     | K, k        | Х, х     | Ch, ch  |
| М, м     | M, m        | Ц, ц     | C, c    |
| Ш, ш     | Š, š        | Ч, ч     | Č, č    |
| Ы, ы     | Y, y        | Э, э     | E, e    |
| Ґ, ґ     | G, g (rare) |          |         |

### Special L Rule (Soft vs Hard)

The letter **Л/л** has two forms depending on the following letter:

| Following Letter                              | Łacinka | IPA  | Description                                 | Example                       |
| --------------------------------------------- | ------- | ---- | ------------------------------------------- | ----------------------------- |
| **Soft vowels:** я, е, і, ё, ю, or ь          | **l**   | /lʲ/ | Soft, palatalized L (like "l" in "million") | ліс → **lis** (forest)        |
| **Hard vowels:** а, о, у, ы, э, or consonants | **ł**   | /ɫ/  | Hard, velarized L (like "dark l" in "ball") | ламаць → **łamać** (to break) |

**More Examples:**

- `ліс` → `lis` (forest - л before і)
- `лямпа` → `liampa` (lamp - л before я)
- `ламаць` → `łamać` (to break - л before а)
- `мыла` → `myła` (soap - л before а)
- `стол` → `stoł` (table - л at end/before consonant)
- `поле` → `pole` (field - л before е)

### Contextual Rules (Iotated Vowels)

| Cyrillic | After consonant | At word start / after vowel, ъ, or ь |
| -------- | --------------- | ------------------------------------ |
| Е, е     | ie              | je                                   |
| Ё, ё     | jo              | jo (always)                          |
| Ю, ю     | u               | ju                                   |
| Я, я     | a               | ja                                   |

**Examples:**

- `Дакумент` → `Dakumient` (е after м → ie)
- `день` → `dzień` (е after н → ie, but нь → ń)
- `лес` → `lies` (е after л → ie)
- `езда` → `jezda` (е at word start → je)
- `Еўропа` → `Jeŭropa` (е at word start → je)
- `сёлета` → `sjoleta` (ё always → jo)
- `ёлка` → `jolka` (ё always → jo)
- `мэбля` → `mieblia` (э → e, pure e sound)

### Palatalization (Soft Sign)

When a consonant is followed by **ь** (soft sign):

| Cyrillic | Łacinka | Example Cyrillic | Example Łacinka |
| -------- | ------- | ---------------- | --------------- |
| Зь, зь   | Ź, ź    | зямля            | źiamla          |
| Нь, нь   | Ń, ń    | конь             | koń             |
| Сь, сь   | Ś, ś    | сям              | śam             |
| Ць, ць   | Ć, ć    | маці             | maći            |
| Ль, ль   | L, l    | поле             | pole            |

**Note:** Regular **л** (without ь) → **ł**, but **ль** → **l**

### Special Notes

- **г** = **h** (voiced glottal fricative /ɦ/): `гара` → `hara`
- **ґ** = **g** (voiced velar plosive /g/, rare in modern Belarusian): `ґрунт` → `grunt`
- **э** = **e**: `эканоміка` → `ekanomika`
- Apostrophe **'** is omitted in transliteration

## File Structure

```
lacinka/
├── manifest.json          # Extension configuration
├── content.js            # Main content script
├── transliterator.js     # Transliteration logic
├── icons/                # Extension icons
│   ├── generate-icons.html
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## Extending to Other Sites

To enable the extension on sites other than Google Drive, edit `manifest.json` and add URL patterns to the `matches` array:

```json
"matches": [
  "https://drive.google.com/*",
  "https://docs.google.com/*",
  "https://example.com/*"  // Add more sites here
]
```

## Known Limitations

- Currently only works on Google Drive/Docs (by design)
- May not catch all Belarusian text if it doesn't contain distinctive characters
- Palatalization detection works for most cases but may need refinement for edge cases

## Contributing

Feel free to improve the transliteration logic or add features!

## License

MIT License - feel free to use and modify as needed.
