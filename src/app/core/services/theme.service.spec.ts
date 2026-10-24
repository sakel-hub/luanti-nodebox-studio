import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    service = new ThemeService();
  });

  it('initializes with dark theme by default', () => {
    expect(service.theme()).toBe('dark');
  });

  it('toggles theme between dark and light', () => {
    expect(service.theme()).toBe('dark');
    service.toggleTheme();
    expect(service.theme()).toBe('light');
    service.toggleTheme();
    expect(service.theme()).toBe('dark');
  });

  it('sets theme explicitly', () => {
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
  });
});
