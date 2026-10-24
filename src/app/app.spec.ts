import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { App } from './app';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { ProjectStore } from './core/state/project.store';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';

describe('App', () => {
  it('instantiates and initializes default panel state', () => {
    const injector = createEnvironmentInjector([ProjectStore, KeyboardShortcutsService], null as any);
    const app = runInInjectionContext(injector, () => new App());
    expect(app).toBeTruthy();
    expect(app.leftWidth()).toBeGreaterThan(0);
    expect(app.rightWidth()).toBeGreaterThan(0);
  });
});
