# Contributing to Luanti NodeBox Studio

Thank you for your interest in contributing to **Luanti NodeBox Studio**! We welcome contributions of all kinds, including bug reports, feature requests, code enhancements, documentation improvements, and **translations**.

---

## 📑 Table of Contents
- [Code of Conduct](#-code-of-conduct)
- [Development Setup](#-development-setup)
- [Contributing Translations](#-contributing-translations)
  - [Overview of the i18n Architecture](#overview-of-the-i18n-architecture)
  - [Option 1: Improving Existing Translations](#option-1-improving-existing-translations)
  - [Option 2: Adding a New Language](#option-2-adding-a-new-language)
  - [Option 3: Contributing Without Coding (GitHub Issues)](#option-3-contributing-without-coding-github-issues)
- [Testing & Validation](#-testing--validation)
- [Submitting a Pull Request](#-submitting-a-pull-request)

---

## 🤝 Code of Conduct
Please be polite, constructive, and respectful to fellow contributors and maintainers. We aim to keep this community open and welcoming to everyone.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `>= 24.16.0` (LTS recommended)
- **npm**: `>= 11.0.0`
- **Git**

### Installation
```bash
# 1. Clone your fork or the repository
git clone https://github.com/sakel-hub/luanti-nodebox-studio.git
cd luanti-nodebox-studio

# 2. Install dependencies
npm ci

# 3. Start local development server
npm start
```
The app will be accessible at `http://localhost:4200/`.

---

## 🌍 Contributing Translations

Luanti NodeBox Studio uses a native, type-safe Angular standalone translation system located in `src/app/core/i18n/`.

### Overview of the i18n Architecture

- **`src/app/core/i18n/translation.types.ts`**: Defines the `TranslationDictionary` interface (type contract) and `LocaleId` / `SUPPORTED_LOCALES`.
- **`src/app/core/i18n/locales/*.ts`**: Contains the dictionary for each language (e.g. `en.ts`, `sk.ts`, `de.ts`, `fr.ts`, `es.ts`, `ru.ts`).
- **`src/app/core/i18n/translation.service.ts`**: The Angular service managing active locale signals, fallback to English, and string interpolation (`{count}`).
- **`src/app/core/i18n/translation.service.spec.ts`**: Automated Vitest test suite ensuring **100% key parity** across all dictionaries.

---

### Option 1: Improving Existing Translations

If you notice a typo, awkward phrasing, or missing context in an existing language:

1. Open the corresponding locale file:
   - English: `src/app/core/i18n/locales/en.ts`
   - Slovak: `src/app/core/i18n/locales/sk.ts`
   - German: `src/app/core/i18n/locales/de.ts`
   - French: `src/app/core/i18n/locales/fr.ts`
   - Spanish: `src/app/core/i18n/locales/es.ts`
   - Russian: `src/app/core/i18n/locales/ru.ts`
2. Update the translation values.
   > **Note:** Preserve placeholder variables enclosed in braces, such as `{count}` (e.g., `'{count} box(es)'`).
3. Run tests to make sure everything passes:
   ```bash
   npm test
   ```
4. Commit your changes and submit a Pull Request!

---

### Option 2: Adding a New Language

Adding a brand new language takes five simple steps:

#### Step 1: Create the dictionary file
Copy `src/app/core/i18n/locales/en.ts` to `src/app/core/i18n/locales/<locale_code>.ts` (using standard ISO 639-1 two-letter code, e.g. `it.ts`, `pl.ts`, `ja.ts`, `pt.ts`).

Translate the strings:
```typescript
import { TranslationDictionary } from '../translation.types';

export const it: TranslationDictionary = {
  common: {
    ok: 'OK',
    cancel: 'Annulla',
    // ...
  },
  // ...
};
```
*Because the object implements `TranslationDictionary`, TypeScript will highlight any missing or mistyped keys.*

#### Step 2: Register the locale in `src/app/core/i18n/translation.types.ts`
1. Add the locale code to the `LocaleId` type union:
   ```typescript
   export type LocaleId = 'en' | 'sk' | 'de' | 'fr' | 'es' | 'ru' | 'it';
   ```
2. Add the metadata object to `SUPPORTED_LOCALES`:
   ```typescript
   export const SUPPORTED_LOCALES: LocaleMeta[] = [
     // ...
     { id: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' }
   ];
   ```

#### Step 3: Register the dictionary in `src/app/core/i18n/translation.service.ts`
Import your dictionary and include it in `DICTIONARIES`:
```typescript
import { it } from './locales/it';

const DICTIONARIES: Record<LocaleId, TranslationDictionary> = {
  en,
  sk,
  de,
  fr,
  es,
  ru,
  it
};
```

#### Step 4: Add to test suite in `src/app/core/i18n/translation.service.spec.ts`
1. Import your dictionary in the test file:
   ```typescript
   import { it as itLocale } from './locales/it';
   ```
2. Include it in the key parity check test (`dictionaries` map):
   ```typescript
   it('should have 100% key parity between English and all other locales', () => {
     const enKeys = extractAllKeyPaths(en);
     const dictionaries = { sk, de, fr, es, ru, it: itLocale };
     // ...
   });
   ```

#### Step 5: Test and build
Run:
```bash
npm test
npm run build
```
If both succeed, you are ready to open your Pull Request!

---

### Option 3: Contributing Without Coding (GitHub Issues)

You don't need to know Git, Angular, or TypeScript to contribute a translation!

1. Open [src/app/core/i18n/locales/en.ts](src/app/core/i18n/locales/en.ts) (or view the English strings).
2. Go to our **[GitHub Issues](https://github.com/sakel-hub/luanti-nodebox-studio/issues/new/choose)**.
3. Choose the **Translation Submission / Correction** issue template (or create a new issue titled `[Translation] <Language Name>`).
4. Provide:
   - Language name & native name (e.g. `Italian / Italiano`)
   - ISO code & flag emoji (e.g. `it` / 🇮🇹)
   - Your translated strings or updated sections
5. A maintainer will format your translations into code and credit you in the release notes!

---

## 🧪 Testing & Validation

Before submitting any code changes or translations, please verify that tests pass and the production build completes without errors:

```bash
# Run unit tests
npm test

# Run production build
npm run build
```

---

## 🚀 Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b i18n/add-italian-translation
   ```
2. Commit your changes with a clear message:
   ```bash
   git commit -m "feat(i18n): add Italian (it) translation"
   ```
3. Push to your fork:
   ```bash
   git push origin i18n/add-italian-translation
   ```
4. Open a Pull Request against the `main` branch.
