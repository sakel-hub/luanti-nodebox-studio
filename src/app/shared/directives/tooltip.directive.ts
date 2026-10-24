import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  inject
} from '@angular/core';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  private el: ElementRef | null = null;
  private shortcutsService: KeyboardShortcutsService | null = null;

  @Input() appTooltip: string = '';
  @Input() appTooltipShortcut?: string;
  @Input() appTooltipShortcutId?: string;
  @Input() appTooltipPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  @Input() appTooltipDelay: number = 150;

  private tooltipEl: HTMLElement | null = null;
  private showTimeout: any = null;

  constructor(
    el?: ElementRef,
    shortcutsService?: KeyboardShortcutsService
  ) {
    if (el) {
      this.el = el;
    } else {
      try {
        this.el = inject(ElementRef);
      } catch {
        this.el = null;
      }
    }

    if (shortcutsService) {
      this.shortcutsService = shortcutsService;
    } else {
      try {
        this.shortcutsService = inject(KeyboardShortcutsService);
      } catch {
        this.shortcutsService = null;
      }
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.scheduleShow();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.scheduleShow();
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.hide();
  }

  @HostListener('click')
  onClick(): void {
    this.hide();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.hide();
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private scheduleShow(): void {
    this.clearTimeout();
    if (!this.appTooltip) return;

    this.showTimeout = setTimeout(() => {
      this.show();
    }, this.appTooltipDelay);
  }

  private clearTimeout(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  private show(): void {
    if (this.tooltipEl || typeof document === 'undefined' || !this.el) return;

    // Parse shorthand syntax: e.g. "Move Tool|W"
    let text = this.appTooltip;
    let shortcut = this.appTooltipShortcut;

    if (!shortcut && text.includes('|')) {
      const parts = text.split('|');
      text = parts[0].trim();
      shortcut = parts[1].trim();
    }

    if (this.appTooltipShortcutId && this.shortcutsService) {
      const formatted = this.shortcutsService.getFormattedKey(this.appTooltipShortcutId);
      if (formatted) {
        shortcut = formatted;
      }
    }

    const tip = document.createElement('div');
    tip.className = 'luanti-tooltip fixed z-[9999] px-2 py-1 text-xs font-medium border rounded-md shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-1.5 whitespace-nowrap transition-opacity duration-150';
    tip.style.opacity = '0';
    tip.setAttribute('role', 'tooltip');

    const span = document.createElement('span');
    span.textContent = text;
    tip.appendChild(span);

    if (shortcut) {
      const kbd = document.createElement('kbd');
      kbd.className = 'px-1.5 py-0.5 text-[10px] font-mono font-semibold border rounded shadow-sm';
      kbd.textContent = shortcut;
      tip.appendChild(kbd);
    }

    document.body.appendChild(tip);
    this.tooltipEl = tip;

    this.positionTooltip();
    tip.style.opacity = '1';
  }

  private positionTooltip(): void {
    if (!this.tooltipEl || !this.el) return;

    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tipRect = this.tooltipEl.getBoundingClientRect();
    const gap = 6;

    let top = 0;
    let left = 0;

    switch (this.appTooltipPlacement) {
      case 'top':
        top = hostRect.top - tipRect.height - gap;
        left = hostRect.left + (hostRect.width - tipRect.width) / 2;
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tipRect.height) / 2;
        left = hostRect.left - tipRect.width - gap;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tipRect.height) / 2;
        left = hostRect.right + gap;
        break;
      case 'bottom':
      default:
        top = hostRect.bottom + gap;
        left = hostRect.left + (hostRect.width - tipRect.width) / 2;
        break;
    }

    // Viewport collision avoidance
    const padding = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Flip vertically if overflow
    if (top < padding && this.appTooltipPlacement === 'top') {
      top = hostRect.bottom + gap;
    } else if (top + tipRect.height > viewportHeight - padding && this.appTooltipPlacement === 'bottom') {
      top = hostRect.top - tipRect.height - gap;
    }

    // Clamp horizontally
    if (left < padding) {
      left = padding;
    } else if (left + tipRect.width > viewportWidth - padding) {
      left = viewportWidth - tipRect.width - padding;
    }

    this.tooltipEl.style.top = `${Math.round(top)}px`;
    this.tooltipEl.style.left = `${Math.round(left)}px`;
  }

  public hide(): void {
    this.clearTimeout();
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }
}
