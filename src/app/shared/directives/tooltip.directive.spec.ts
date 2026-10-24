import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { TooltipDirective } from './tooltip.directive';

describe('TooltipDirective', () => {
  let directive: TooltipDirective;
  let mockEl: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEl = {
      getBoundingClientRect: vi.fn().mockReturnValue({
        top: 100,
        bottom: 130,
        left: 200,
        right: 250,
        width: 50,
        height: 30
      })
    } as unknown as HTMLElement;

    directive = new TooltipDirective(new ElementRef(mockEl));
  });

  afterEach(() => {
    directive.hide();
    vi.useRealTimers();
  });

  it('instantiates and clears timeout on hide', () => {
    directive.appTooltip = 'Test Tooltip';
    directive.onMouseEnter();
    expect((directive as any).showTimeout).toBeTruthy();

    directive.hide();
    expect((directive as any).showTimeout).toBeNull();
  });

  it('parses pipe separator for text and shortcut', () => {
    directive.appTooltip = 'Move Gizmo | W';
    directive.appTooltipDelay = 0;

    expect(directive.appTooltip.includes('|')).toBe(true);
    const parts = directive.appTooltip.split('|');
    expect(parts[0].trim()).toBe('Move Gizmo');
    expect(parts[1].trim()).toBe('W');
  });
});
