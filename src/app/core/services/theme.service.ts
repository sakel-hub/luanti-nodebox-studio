import { Injectable, signal, effect } from '@angular/core';
import { safeGetItem, safeSetItem } from '../utils/storage.utils';

export type AppTheme = 'dark' | 'light';

const STORAGE_KEY = 'luanti_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public readonly theme = signal<AppTheme>(this.loadInitialTheme());

  constructor() {
    this.applyThemeToDOM(this.theme());

    try {
      effect(() => {
        const current = this.theme();
        this.applyThemeToDOM(current);
        safeSetItem(STORAGE_KEY, current);
      });
    } catch {
      // Bypassed if outside injection context
    }
  }

  private loadInitialTheme(): AppTheme {
    const saved = safeGetItem(STORAGE_KEY) as AppTheme | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }

    return 'dark';
  }

  public toggleTheme(): void {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  public setTheme(theme: AppTheme): void {
    this.theme.set(theme);
  }

  private applyThemeToDOM(theme: AppTheme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }
}
