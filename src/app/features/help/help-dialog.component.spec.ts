import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { HelpDialogComponent } from './help-dialog.component';

describe('HelpDialogComponent', () => {
  it('should create and default to coordinates tab', () => {
    const comp = new HelpDialogComponent();
    expect(comp.activeTab()).toBe('coordinates');
  });

  it('should switch tabs', () => {
    const comp = new HelpDialogComponent();
    comp.activeTab.set('viewport');
    expect(comp.activeTab()).toBe('viewport');

    comp.activeTab.set('textures');
    expect(comp.activeTab()).toBe('textures');
  });

  it('should emit close on escape', () => {
    const comp = new HelpDialogComponent();
    let closed = false;
    comp.close.subscribe(() => { closed = true; });

    comp.onEscape();
    expect(closed).toBe(true);
  });
});
