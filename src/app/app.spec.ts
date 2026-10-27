import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { App } from './app';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ProjectStore } from './core/state/project.store';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { TextureService } from './core/services/texture.service';
import { TexturePainterService } from './core/services/texture-painter.service';
import { TranslationService } from './core/i18n/translation.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

describe('App', () => {
  const commonProviders = [
    ProjectStore,
    KeyboardShortcutsService,
    TextureService,
    TexturePainterService,
    TranslationService,
    PwaUpdateService
  ];

  it('instantiates and initializes default panel state', () => {
    const injector = createEnvironmentInjector(commonProviders, null as any);
    const app = runInInjectionContext(injector, () => new App());
    expect(app).toBeTruthy();
    expect(app.leftWidth()).toBeGreaterThan(0);
    expect(app.rightWidth()).toBeGreaterThan(0);
    expect(app.mobileSheetTab()).toBe('none');
    expect(app.showHelpModal()).toBe(false);
    expect(app.showShareModal()).toBe(false);
  });

  it('manages mobile sheet navigation and synchronization with right panel', () => {
    const injector = createEnvironmentInjector(commonProviders, null as any);
    const app = runInInjectionContext(injector, () => new App());

    // Open layers sheet
    app.openMobileTab('layers');
    expect(app.mobileSheetTab()).toBe('layers');
    expect(app.mobileSheetTitle()).toBe('NodeBoxes');

    // Tapping the same tab toggles it closed
    app.openMobileTab('layers');
    expect(app.mobileSheetTab()).toBe('none');

    // Open inspector sheet
    app.openMobileTab('inspector');
    expect(app.mobileSheetTab()).toBe('inspector');
    expect(app.activeRightTab()).toBe('inspector');
    expect(app.mobileSheetTitle()).toBe('Box Inspector');

    // Open textures sheet
    app.openMobileTab('textures');
    expect(app.mobileSheetTab()).toBe('textures');
    expect(app.activeRightTab()).toBe('textures');
    expect(app.mobileSheetTitle()).toBe('Texture Studio');

    // Open code sheet
    app.openMobileTab('code');
    expect(app.mobileSheetTab()).toBe('code');
    expect(app.mobileSheetTitle()).toBe('Lua Code & Generator');

    // Close sheet directly
    app.closeMobileSheet();
    expect(app.mobileSheetTab()).toBe('none');
  });

  it('closes mobile sheet when Escape key is pressed', () => {
    const injector = createEnvironmentInjector(commonProviders, null as any);
    const app = runInInjectionContext(injector, () => new App());

    app.openMobileTab('inspector');
    expect(app.mobileSheetTab()).toBe('inspector');

    app.handleGlobalShortcuts({ key: 'Escape' } as KeyboardEvent);
    expect(app.mobileSheetTab()).toBe('none');
  });
});
