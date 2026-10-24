import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';
import { LocaleId, SUPPORTED_LOCALES, TranslationKey } from './translation.types';
import { en } from './locales/en';
import { sk } from './locales/sk';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { ru } from './locales/ru';

describe('TranslationService', () => {
  let service: TranslationService;

  beforeEach(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map<string, string>();
      (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => { store.clear(); },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        length: 0
      };
    } else {
      localStorage.clear();
    }
    service = new TranslationService();
  });

  it('should initialize with default locale (en)', () => {
    expect(service.currentLocale()).toBe('en');
    expect(service.t('common.ok')).toBe('OK');
  });

  it('should switch to Slovak locale and translate correctly', () => {
    service.setLocale('sk');
    expect(service.currentLocale()).toBe('sk');
    expect(service.t('common.ok')).toBe('OK');
    expect(service.t('common.cancel')).toBe('Zrušiť');
    expect(service.t('header.title')).toBe('Luanti NodeBox Štúdio');
  });

  it('should switch to German, French, Spanish, and Russian', () => {
    service.setLocale('de');
    expect(service.t('common.cancel')).toBe('Abbrechen');

    service.setLocale('fr');
    expect(service.t('common.cancel')).toBe('Annuler');

    service.setLocale('es');
    expect(service.t('common.cancel')).toBe('Cancelar');

    service.setLocale('ru');
    expect(service.t('common.cancel')).toBe('Отмена');
  });

  it('should interpolate parameters correctly', () => {
    service.setLocale('en');
    expect(service.t('layers.boxCount', { count: 3 })).toBe('3 box(es)');

    service.setLocale('sk');
    expect(service.t('layers.boxCount', { count: 3 })).toBe('3 box(ov)');
  });

  function extractAllKeyPaths(obj: Record<string, any>, prefix = ''): string[] {
    let keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys = keys.concat(extractAllKeyPaths(v, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys;
  }

  it('should have 100% key parity between English and all other locales', () => {
    const enKeys = extractAllKeyPaths(en);
    const dictionaries = { sk, de, fr, es, ru };

    for (const [loc, dict] of Object.entries(dictionaries)) {
      const locKeys = extractAllKeyPaths(dict);
      const missingKeys = enKeys.filter(k => !locKeys.includes(k));
      expect(missingKeys).toEqual([]);
    }
  });
});
