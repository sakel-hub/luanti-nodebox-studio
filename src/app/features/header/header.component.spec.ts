import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { HeaderComponent } from './header.component';
import { ProjectStore } from '../../core/state/project.store';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslationService } from '../../core/i18n/translation.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;

  beforeEach(() => {
    const injector = createEnvironmentInjector([
      ProjectStore,
      KeyboardShortcutsService,
      ThemeService,
      TranslationService
    ], null as any);
    component = runInInjectionContext(injector, () => new HeaderComponent());
  });

  it('should create and have default signals', () => {
    expect(component).toBeTruthy();
    expect(component.showMobileMenu()).toBe(false);
    expect(component.canInstallPwa()).toBe(false);
  });

  it('should toggle and close mobile menu', () => {
    component.toggleMobileMenu();
    expect(component.showMobileMenu()).toBe(true);

    component.closeMobileMenu();
    expect(component.showMobileMenu()).toBe(false);
  });

  it('should emit openHelp and openShare events', () => {
    let helpEmitted = false;
    let shareEmitted = false;
    component.openHelp.subscribe(() => { helpEmitted = true; });
    component.openShare.subscribe(() => { shareEmitted = true; });

    component.openHelp.emit();
    component.openShare.emit();

    expect(helpEmitted).toBe(true);
    expect(shareEmitted).toBe(true);
  });
});
