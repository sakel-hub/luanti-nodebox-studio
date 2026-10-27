import { Component, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  LucideShare2,
  LucideX,
  LucideCopy,
  LucideCheck,
  LucideMessageSquare,
  LucideGlobe
} from '@lucide/angular';

@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LucideShare2,
    LucideX,
    LucideCopy,
    LucideCheck,
    LucideMessageSquare,
    LucideGlobe
  ],
  template: `
    <div
      class="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
      (click)="onBackdropClick($event)">
      <div
        class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <svg lucideShare2 class="w-5 h-5"></svg>
            </div>
            <div>
              <h2 id="share-dialog-title" class="text-base font-bold text-slate-100">
                {{ 'share.title' | translate }}
              </h2>
              <p class="text-xs text-slate-400">{{ 'share.subtitle' | translate }}</p>
            </div>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition"
            aria-label="Close dialog">
            <svg lucideX class="w-5 h-5"></svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Copy Link Bar -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Direct Link</label>
            <div class="flex items-center gap-2">
              <input
                type="text"
                readonly
                [value]="shareUrl"
                class="flex-1 bg-slate-950 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono select-all focus:outline-none focus:border-sky-500" />
              <button
                type="button"
                (click)="copyLink()"
                class="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                @if (copied()) {
                  <svg lucideCheck class="w-4 h-4 text-emerald-300"></svg>
                  <span>{{ 'share.linkCopied' | translate }}</span>
                } @else {
                  <svg lucideCopy class="w-4 h-4"></svg>
                  <span>{{ 'share.copyLink' | translate }}</span>
                }
              </button>
            </div>
          </div>

          <!-- Native Device Share (if available) -->
          @if (canNativeShare) {
            <button
              type="button"
              (click)="shareNative()"
              class="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition">
              <svg lucideShare2 class="w-4 h-4"></svg>
              <span>{{ 'share.shareViaDevice' | translate }}</span>
            </button>
          }

          <!-- Social Share Grid -->
          <div>
            <span class="block text-xs font-semibold text-slate-300 mb-2">Share on Social Platforms</span>
            <div class="grid grid-cols-2 gap-2.5">
              <!-- X / Twitter -->
              <a
                [href]="twitterShareUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 rounded-xl flex items-center gap-2.5 text-xs text-slate-200 transition group">
                <span class="text-base">𝕏</span>
                <span class="font-medium group-hover:text-sky-400 transition">{{ 'share.shareOnX' | translate }}</span>
              </a>

              <!-- Reddit -->
              <a
                [href]="redditShareUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/50 rounded-xl flex items-center gap-2.5 text-xs text-slate-200 transition group">
                <svg lucideGlobe class="w-4 h-4 text-orange-400"></svg>
                <span class="font-medium group-hover:text-orange-400 transition">{{ 'share.shareOnReddit' | translate }}</span>
              </a>

              <!-- WhatsApp -->
              <a
                [href]="whatsAppShareUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex items-center gap-2.5 text-xs text-slate-200 transition group">
                <svg lucideMessageSquare class="w-4 h-4 text-emerald-400"></svg>
                <span class="font-medium group-hover:text-emerald-400 transition">{{ 'share.shareOnWhatsApp' | translate }}</span>
              </a>

              <!-- Facebook -->
              <a
                [href]="facebookShareUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="p-2.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-xl flex items-center gap-2.5 text-xs text-slate-200 transition group">
                <svg lucideShare2 class="w-4 h-4 text-blue-400"></svg>
                <span class="font-medium group-hover:text-blue-400 transition">{{ 'share.shareOnFacebook' | translate }}</span>
              </a>
            </div>
          </div>

          <!-- Discord / Markdown copy -->
          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              (click)="copyDiscordMarkdown()"
              class="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition">
              <svg lucideCopy class="w-4 h-4"></svg>
              <span>{{ 'share.shareOnDiscord' | translate }}</span>
            </button>

            <!-- GitHub Repository Link -->
            <a
              href="https://github.com/sakel-hub/luanti-nodebox-studio"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1.5 transition">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>{{ 'share.viewGitHub' | translate }}</span>
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition">
            {{ 'common.close' | translate }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class ShareDialogComponent {
  @Output() close = new EventEmitter<void>();

  readonly copied = signal<boolean>(false);

  readonly shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://sakel-hub.github.io/luanti-nodebox-studio/';
  readonly shareTitle = 'Luanti NodeBox Studio — Visual 3D NodeBox & Texture Editor for Luanti/Minetest';
  readonly shareText = 'Create, preview, texture, and export pixel-perfect 3D nodeboxes for Luanti / Minetest with real-time animated textures and Lua generator!';

  get canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';
  }

  get twitterShareUrl(): string {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareTitle)}&url=${encodeURIComponent(this.shareUrl)}`;
  }

  get redditShareUrl(): string {
    return `https://www.reddit.com/submit?url=${encodeURIComponent(this.shareUrl)}&title=${encodeURIComponent(this.shareTitle)}`;
  }

  get whatsAppShareUrl(): string {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(this.shareTitle + ' ' + this.shareUrl)}`;
  }

  get facebookShareUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  async copyLink(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(this.shareUrl);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      }
    } catch {
      // Fallback
    }
  }

  async copyDiscordMarkdown(): Promise<void> {
    const text = `**${this.shareTitle}**\n${this.shareText}\n${this.shareUrl}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      }
    } catch {
      // Fallback
    }
  }

  async shareNative(): Promise<void> {
    try {
      if (this.canNativeShare) {
        await (navigator as any).share({
          title: this.shareTitle,
          text: this.shareText,
          url: this.shareUrl
        });
      }
    } catch {
      // User cancelled share
    }
  }
}
