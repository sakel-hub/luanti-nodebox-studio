import { Injectable, computed, signal } from '@angular/core';
import { LocaleId, LocaleMeta, SUPPORTED_LOCALES, TranslationDictionary, TranslationKey } from './translation.types';
import { en } from './locales/en';
import { sk } from './locales/sk';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { ru } from './locales/ru';

const DICTIONARIES: Record<LocaleId, TranslationDictionary> = {
  en,
  sk,
  de,
  fr,
  es,
  ru
};

const STORAGE_KEY = 'luanti_locale';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  readonly supportedLocales: LocaleMeta[] = SUPPORTED_LOCALES;

  readonly currentLocale = signal<LocaleId>(this.detectInitialLocale());

  readonly currentDictionary = computed<TranslationDictionary>(() => {
    return DICTIONARIES[this.currentLocale()] || DICTIONARIES.en;
  });

  constructor() {
    this.persistLocale(this.currentLocale());
  }

  setLocale(locale: LocaleId): void {
    if (DICTIONARIES[locale]) {
      this.currentLocale.set(locale);
      this.persistLocale(locale);
    }
  }

  private persistLocale(loc: LocaleId): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, loc);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.lang = loc;
      }
    } catch {
      // Silently ignore in restricted storage environments
    }
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    const dict = this.currentDictionary();
    let text = this.resolveKey(dict, key);

    // Fallback to English if missing
    if (text === undefined) {
      text = this.resolveKey(DICTIONARIES.en, key);
    }

    if (text === undefined) {
      return key;
    }

    if (params) {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }
    }

    return text;
  }

  private resolveKey(obj: any, path: string): string | undefined {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') {
        return undefined;
      }
      curr = curr[part];
    }
    return typeof curr === 'string' ? curr : undefined;
  }

  private detectInitialLocale(): LocaleId {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_KEY) as LocaleId;
        if (saved && DICTIONARIES[saved]) {
          return saved;
        }
      }
      if (typeof navigator !== 'undefined' && navigator.language) {
        const browserLang = navigator.language.split('-')[0].toLowerCase() as LocaleId;
        if (DICTIONARIES[browserLang]) {
          return browserLang;
        }
      }
    } catch {
      // Ignore errors in environments where localStorage/navigator is absent
    }
    return 'en';
  }
}
