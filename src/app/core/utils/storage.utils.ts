/**
 * Safe LocalStorage accessor utilities that handle SSR/Node environments,
 * disabled cookies/storage, and storage quota exceeded errors gracefully.
 */

export function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // Storage access denied or disabled
  }
  return null;
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return true;
    }
  } catch {
    // Storage access denied or quota exceeded
  }
  return false;
}

export function safeRemoveItem(key: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return true;
    }
  } catch {
    // Storage access denied
  }
  return false;
}
