import { Component, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import { FractionFormat, NodeboxProject, NodeboxType } from '../../core/models/nodebox.model';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  LucideUndo,
  LucideRedo,
  LucideKeyboard,
  LucideSun,
  LucideMoon,
  LucideSettings,
  LucideX,
  LucideHelpCircle,
  LucideShare2,
  LucideMenu,
  LucideDownload,
  LucideUpload,
  LucideEye,
  LucideGrid3x3,
  LucideChevronRight,
  LucideExternalLink,
  LucideRefreshCw,
  LucideSparkles,
  LucideTrash2
} from '@lucide/angular';
import { PwaUpdateService } from '../../core/services/pwa-update.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TooltipDirective,
    TranslatePipe,
    LucideUndo,
    LucideRedo,
    LucideKeyboard,
    LucideSun,
    LucideMoon,
    LucideSettings,
    LucideX,
    LucideHelpCircle,
    LucideShare2,
    LucideMenu,
    LucideDownload,
    LucideUpload,
    LucideEye,
    LucideGrid3x3,
    LucideChevronRight,
    LucideExternalLink,
    LucideRefreshCw,
    LucideSparkles,
    LucideTrash2
  ],
  host: {
    'class': 'block relative flex-shrink-0',
    '[class.z-[100]]': 'showMobileMenu()',
    '[class.z-50]': 'showDesktopUpdatesMenu() && !showMobileMenu()',
    '[style.z-index]': 'showMobileMenu() ? "100" : (showDesktopUpdatesMenu() ? "50" : "25")'
  },
  template: `
    <header
      style="padding-top: env(safe-area-inset-top, 0px); padding-left: max(0.75rem, env(safe-area-inset-left, 0px)); padding-right: max(0.75rem, env(safe-area-inset-right, 0px));"
      class="bg-slate-950 border-b border-slate-800 flex flex-col justify-start text-xs select-none relative flex-shrink-0 z-20"
      [class.!z-50]="showDesktopUpdatesMenu()">
      <div class="h-12 flex items-center justify-between w-full">
        <!-- ========================================== -->
        <!-- MOBILE HEADER BAR (< md)                   -->
        <!-- ========================================== -->
      <div class="flex md:hidden items-center justify-between w-full">
        <!-- Mobile Logo & App Title -->
        <div class="flex items-center gap-2 min-w-0">
          <img
            src="logo.svg"
            alt="Luanti NodeBox Studio"
            width="28"
            height="28"
            class="w-7 h-7 rounded-md shadow-md flex-shrink-0" />
          <div class="truncate">
            <div class="font-bold text-slate-100 text-xs tracking-tight flex items-center gap-1.5">
              <span>NodeBox</span>
              <span class="text-[9px] bg-sky-950 text-sky-400 border border-sky-800 px-1 py-0.2 rounded font-mono">PWA</span>
            </div>
          </div>
        </div>

        <!-- Mobile Right Quick Actions: Quick Guide, Share, Undo, Redo, Menu -->
        <div class="flex items-center gap-1">
          <!-- Quick Guide -->
          <button
            (click)="openHelp.emit()"
            [attr.aria-label]="'header.help' | translate"
            class="w-8 h-8 rounded flex items-center justify-center text-sky-400 hover:bg-slate-800 transition active:scale-95">
            <svg lucideHelpCircle class="w-4 h-4"></svg>
          </button>

          <!-- Share -->
          <button
            (click)="openShare.emit()"
            [attr.aria-label]="'header.share' | translate"
            class="w-8 h-8 rounded flex items-center justify-center text-purple-400 hover:bg-slate-800 transition active:scale-95">
            <svg lucideShare2 class="w-4 h-4"></svg>
          </button>

          <!-- Undo -->
          <button
            (click)="projectStore.undo()"
            [disabled]="!projectStore.canUndo()"
            [attr.aria-label]="'common.undo' | translate"
            class="w-8 h-8 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95">
            <svg lucideUndo class="w-3.5 h-3.5"></svg>
          </button>

          <!-- Redo -->
          <button
            (click)="projectStore.redo()"
            [disabled]="!projectStore.canRedo()"
            [attr.aria-label]="'common.redo' | translate"
            class="w-8 h-8 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95">
            <svg lucideRedo class="w-3.5 h-3.5"></svg>
          </button>

          <!-- Hamburger Overflow Menu Button -->
          <button
            (click)="toggleMobileMenu()"
            [attr.aria-expanded]="showMobileMenu()"
            [attr.aria-label]="'header.menu' | translate"
            class="w-8 h-8 rounded bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-200 hover:bg-slate-800 transition active:scale-95 ml-1">
            <svg lucideMenu class="w-4 h-4"></svg>
          </button>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- DESKTOP HEADER BAR (>= md)                 -->
      <!-- ========================================== -->
      <div class="hidden md:flex items-center justify-between w-full">
        <!-- Left: Logo & Project Naming -->
        <div class="flex items-center gap-3">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <img
              src="logo.svg"
              alt="Luanti NodeBox Studio"
              width="30"
              height="30"
              class="w-7.5 h-7.5 rounded-md shadow-md flex-shrink-0" />
            <div>
              <h1 class="font-bold text-slate-100 text-xs tracking-tight flex items-center gap-1.5 m-0 p-0 font-sans">
                <span>{{ 'header.title' | translate }}</span>
                <span class="text-[9px] bg-sky-950 text-sky-400 border border-sky-800 px-1.5 py-0.2 rounded font-mono">{{ 'header.pwaBadge' | translate }}</span>
              </h1>
            </div>
          </div>

          <div class="h-5 w-px bg-slate-800 mx-1"></div>

          <!-- Project Title & Node Name -->
          <div class="flex items-center gap-2">
            <input
              type="text"
              [ngModel]="projectStore.project().name"
              (ngModelChange)="projectStore.setProjectName($event)"
              [title]="'header.projectTitle' | translate"
              class="bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent hover:border-slate-800 focus:border-slate-700 rounded px-2 py-1 text-slate-200 font-medium focus:outline-none transition w-32 lg:w-36" />
            <span class="text-slate-500">:</span>
            <input
              type="text"
              [ngModel]="projectStore.project().nodeName"
              (ngModelChange)="projectStore.setNodeName($event)"
              [title]="'header.nodeName' | translate"
              [placeholder]="'header.nodeNamePlaceholder' | translate"
              class="bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent hover:border-slate-800 focus:border-slate-700 rounded px-2 py-1 text-slate-400 font-mono focus:outline-none transition w-40 lg:w-44" />
          </div>
        </div>

        <!-- Center: History & Presets -->
        <div class="flex items-center gap-1">
          <!-- Undo / Redo -->
          <button
            (click)="projectStore.undo()"
            [disabled]="!projectStore.canUndo()"
            [appTooltip]="'common.undo' | translate"
            [appTooltipShortcutId]="'edit_undo'"
            class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition">
            <svg lucideUndo class="w-4 h-4"></svg>
          </button>
          <button
            (click)="projectStore.redo()"
            [disabled]="!projectStore.canRedo()"
            [appTooltip]="'common.redo' | translate"
            [appTooltipShortcutId]="'edit_redo'"
            class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition">
            <svg lucideRedo class="w-4 h-4"></svg>
          </button>

          <div class="h-4 w-px bg-slate-800 mx-1"></div>

          <!-- Presets Button -->
          <button
            (click)="openPresets.emit()"
            [appTooltip]="'header.presets' | translate"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-medium transition">
            <svg lucideGrid3x3 class="w-3.5 h-3.5 text-sky-400"></svg>
            {{ 'header.presets' | translate }}
          </button>

          <!-- Presentation Render Mode Button -->
          <button
            (click)="projectStore.toggleRenderMode(true)"
            [appTooltip]="'header.renderMode' | translate"
            [appTooltipShortcutId]="'view_render_mode'"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium transition text-xs">
            <svg lucideEye class="w-3.5 h-3.5"></svg>
            <span>Render</span>
          </button>

          <!-- Keyboard Shortcuts Button -->
          <button
            (click)="shortcutsService.openShortcutsModal()"
            [appTooltip]="'header.shortcuts' | translate"
            [appTooltipShortcutId]="'help_shortcuts'"
            class="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-medium transition text-xs">
            <svg lucideKeyboard class="w-3.5 h-3.5 text-sky-400"></svg>
            <span class="hidden lg:inline">{{ 'header.shortcuts' | translate }}</span>
          </button>

          <!-- New Button -->
          <button
            (click)="confirmReset()"
            [appTooltip]="'header.newProject' | translate"
            class="px-2.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
            {{ 'common.new' | translate }}
          </button>
        </div>

        <!-- Right: Grid Snap, Language Switcher, Share, GitHub, Help, Theme -->
        <div class="flex items-center gap-1.5 lg:gap-2">
          <!-- Nodebox Type Selector -->
          <div class="flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
            <span class="text-slate-500 font-mono">Type:</span>
            <select
              [ngModel]="projectStore.project().nodeboxType"
              (ngModelChange)="projectStore.setNodeboxType($event)"
              class="bg-transparent text-sky-400 font-semibold focus:outline-none cursor-pointer capitalize">
              <option value="fixed" class="bg-slate-900 text-slate-200">Fixed</option>
              <option value="connected" class="bg-slate-900 text-slate-200">Connected</option>
              <option value="wallmounted" class="bg-slate-900 text-slate-200">Wallmounted</option>
              <option value="leveled" class="bg-slate-900 text-slate-200">Leveled</option>
              <option value="regular" class="bg-slate-900 text-slate-200">Regular</option>
            </select>
          </div>

          <!-- Snap Resolution Selector -->
          <div class="flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
            <span class="text-slate-500 font-mono">{{ 'header.snap' | translate }}:</span>
            <select
              [ngModel]="projectStore.project().snapResolution"
              (ngModelChange)="projectStore.setSnapResolution($event)"
              class="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-mono">
              <option [value]="16">1/16</option>
              <option [value]="32">1/32</option>
              <option [value]="64">1/64</option>
            </select>
          </div>

          <!-- Model Height Selector (1 Node vs 2 Nodes) -->
          <div class="hidden xl:flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
            <span class="text-slate-500 font-mono">{{ 'header.height' | translate }}:</span>
            <select
              [ngModel]="projectStore.project().nodeHeight"
              (ngModelChange)="projectStore.setNodeHeight(+$event)"
              class="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-mono">
              <option [value]="1">1</option>
              <option [value]="2">2</option>
            </select>
          </div>

          <!-- Project JSON Save / Load -->
          <button
            (click)="exportProjectJson()"
            [appTooltip]="'header.saveJson' | translate"
            class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
            <svg lucideDownload class="w-4 h-4"></svg>
          </button>

          <label
            [appTooltip]="'header.loadJson' | translate"
            class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition">
            <svg lucideUpload class="w-4 h-4"></svg>
            <input type="file" accept=".json" (change)="importProjectJson($event)" class="hidden" />
          </label>

          <div class="h-4 w-px bg-slate-800 mx-0.5"></div>

          <!-- Language Switcher Dropdown -->
          <div class="relative">
            <select
              [ngModel]="translationService.currentLocale()"
              (ngModelChange)="translationService.setLocale($event)"
              [title]="'Language / Jazyk / Sprache'"
              class="bg-slate-900 border border-slate-700/80 hover:border-slate-600 rounded px-1.5 py-1 text-slate-200 text-xs font-medium cursor-pointer focus:outline-none focus:border-sky-500">
              @for (loc of translationService.supportedLocales; track loc.id) {
                <option [value]="loc.id">{{ loc.flag }} {{ loc.nativeName }}</option>
              }
            </select>
          </div>

          <!-- Quick Guide / Help Button -->
          <button
            (click)="openHelp.emit()"
            [appTooltip]="'header.help' | translate"
            class="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-sky-400 hover:text-sky-300 transition">
            <svg lucideHelpCircle class="w-4 h-4"></svg>
          </button>

          <!-- Social Share Button -->
          <button
            (click)="openShare.emit()"
            [appTooltip]="'header.share' | translate"
            class="p-1.5 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-purple-300 hover:text-purple-200 transition">
            <svg lucideShare2 class="w-4 h-4 text-purple-400"></svg>
          </button>

          <!-- Dedicated GitHub Repository Link -->
          <a
            href="https://github.com/sakel-hub/luanti-nodebox-studio"
            target="_blank"
            rel="noopener noreferrer"
            [appTooltip]="'header.github' | translate"
            class="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-100 transition flex items-center justify-center">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          <!-- Theme Toggle (Dark / Light) -->
          <button
            (click)="themeService.toggleTheme()"
            [appTooltip]="themeService.theme() === 'dark' ? ('header.themeLight' | translate) : ('header.themeDark' | translate)"
            class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
            @if (themeService.theme() === 'dark') {
              <svg lucideSun class="w-4 h-4 text-amber-400"></svg>
            } @else {
              <svg lucideMoon class="w-4 h-4 text-sky-400"></svg>
            }
          </button>

          <!-- App Updates & Cache Menu (Desktop) -->
          <div class="relative z-50">
            <button
              (click)="toggleDesktopUpdatesMenu()"
              [appTooltip]="'header.checkForUpdates' | translate"
              class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition relative flex items-center justify-center">
              <svg lucideRefreshCw class="w-4 h-4" [class.animate-spin]="pwaUpdateService.checkingForUpdate()"></svg>
              @if (pwaUpdateService.updateAvailable()) {
                <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-ping"></span>
                <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-950"></span>
              }
            </button>

            @if (showDesktopUpdatesMenu()) {
              <!-- Click-away backdrop -->
              <div
                (click)="closeDesktopUpdatesMenu()"
                class="fixed inset-0 z-40"></div>

              <!-- Updates Popover Dropdown -->
              <div
                class="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2.5 text-xs animate-menu-in">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div class="flex items-center gap-1.5">
                    <svg lucideRefreshCw class="w-3.5 h-3.5 text-sky-400"></svg>
                    <span class="font-bold text-slate-200">App Updates & Cache</span>
                  </div>
                  <button
                    (click)="closeDesktopUpdatesMenu()"
                    class="text-slate-500 hover:text-slate-300 p-0.5 rounded">
                    <svg lucideX class="w-3.5 h-3.5"></svg>
                  </button>
                </div>

                @if (pwaUpdateService.updateAvailable()) {
                  <button
                    (click)="pwaUpdateService.activateUpdate(); closeDesktopUpdatesMenu()"
                    class="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-medium flex items-center justify-between shadow-md transition active:scale-95">
                    <span class="flex items-center gap-2">
                      <svg lucideSparkles class="w-3.5 h-3.5"></svg>
                      <span>{{ 'header.updateNow' | translate }}</span>
                    </span>
                    <svg lucideRefreshCw class="w-3.5 h-3.5 animate-spin"></svg>
                  </button>
                }

                <button
                  (click)="pwaUpdateService.checkForUpdate(true)"
                  [disabled]="pwaUpdateService.checkingForUpdate()"
                  class="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition text-slate-300 disabled:opacity-60">
                  <span class="flex items-center gap-2 font-medium">
                    <svg lucideRefreshCw class="w-3.5 h-3.5 text-sky-400" [class.animate-spin]="pwaUpdateService.checkingForUpdate()"></svg>
                    <span>
                      @if (pwaUpdateService.checkingForUpdate()) {
                        {{ 'header.checkingUpdates' | translate }}
                      } @else if (pwaUpdateService.statusMessage()) {
                        {{ pwaUpdateService.statusMessage()! | translate }}
                      } @else {
                        {{ 'header.checkForUpdates' | translate }}
                      }
                    </span>
                  </span>
                </button>

                <button
                  (click)="confirmClearCache(); closeDesktopUpdatesMenu()"
                  class="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-red-950/20 border border-slate-800 hover:border-red-800/40 text-slate-400 hover:text-red-300 transition text-[11px]">
                  <span class="flex items-center gap-2 font-medium">
                    <svg lucideTrash2 class="w-3.5 h-3.5 text-slate-500"></svg>
                    <span>{{ 'header.clearCache' | translate }}</span>
                  </span>
                </button>
              </div>
            }
          </div>

          <!-- Update Available Button (Desktop) -->
          @if (pwaUpdateService.updateAvailable()) {
            <button
              (click)="pwaUpdateService.activateUpdate()"
              [appTooltip]="'header.updateNow' | translate"
              class="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-medium px-2.5 py-1 rounded shadow animate-pulse transition">
              <svg lucideRefreshCw class="w-3.5 h-3.5"></svg>
              <span>{{ 'header.updateNow' | translate }}</span>
            </button>
          }

          <!-- Install PWA App Button (if available) -->
          @if (canInstallPwa()) {
            <button
              (click)="installPwa()"
              class="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium px-2.5 py-1 rounded shadow transition">
              <svg lucideDownload class="w-3.5 h-3.5"></svg>
              {{ 'header.installApp' | translate }}
            </button>
          }
        </div>
      </div>
      </div>
    </header>

    <!-- ========================================== -->
    <!-- MOBILE SETTINGS & OVERFLOW DRAWER          -->
    <!-- ========================================== -->
    @if (showMobileMenu()) {
      <!-- Backdrop -->
      <div
        (click)="closeMobileMenu()"
        class="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90] transition-opacity"></div>

      <!-- Slide-in Drawer Container -->
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'header.menu' | translate"
        class="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800 shadow-2xl z-[100] flex flex-col animate-menu-in">
        <!-- Drawer Header -->
        <div
          style="padding-top: env(safe-area-inset-top, 0px);"
          class="border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <div class="h-14 px-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-white">
                <svg lucideSettings class="w-3.5 h-3.5 text-white"></svg>
              </div>
              <span class="font-bold text-sm text-slate-100">{{ 'header.menu' | translate }}</span>
            </div>
            <button
              (click)="closeMobileMenu()"
              [attr.aria-label]="'common.close' | translate"
              class="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition">
              <svg lucideX class="w-5 h-5"></svg>
            </button>
          </div>
        </div>

        <!-- Drawer Body (Scrollable) -->
        <div
          style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));"
          class="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-200">
          <!-- Language Selection -->
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Language / Jazyk</label>
            <select
              [ngModel]="translationService.currentLocale()"
              (ngModelChange)="translationService.setLocale($event)"
              class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 text-xs font-medium">
              @for (loc of translationService.supportedLocales; track loc.id) {
                <option [value]="loc.id">{{ loc.flag }} {{ loc.nativeName }} ({{ loc.name }})</option>
              }
            </select>
          </div>

          <!-- Quick Guide & Social Share -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Documentation & Sharing</label>
            <div class="flex flex-col gap-2">
              <button
                (click)="openHelp.emit(); closeMobileMenu()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-sky-400 transition">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideHelpCircle class="w-4 h-4 text-sky-400"></svg>
                  <span>{{ 'header.help' | translate }}</span>
                </span>
                <svg lucideChevronRight class="w-3.5 h-3.5 text-sky-400"></svg>
              </button>

              <button
                (click)="openShare.emit(); closeMobileMenu()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/50 text-purple-300 transition">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideShare2 class="w-4 h-4 text-purple-400"></svg>
                  <span>{{ 'header.share' | translate }}</span>
                </span>
                <svg lucideChevronRight class="w-3.5 h-3.5 text-purple-400"></svg>
              </button>

              <a
                href="https://github.com/sakel-hub/luanti-nodebox-studio"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition">
                <span class="flex items-center gap-2 font-medium">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>{{ 'header.github' | translate }}</span>
                </span>
                <svg lucideExternalLink class="w-3.5 h-3.5 text-slate-500"></svg>
              </a>
            </div>
          </div>

          <!-- 1. Project Naming -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{{ 'header.projectTitle' | translate }}</label>
            <div class="space-y-2">
              <div>
                <span class="text-[10px] text-slate-500 mb-0.5 block">{{ 'header.projectTitle' | translate }}</span>
                <input
                  type="text"
                  [ngModel]="projectStore.project().name"
                  (ngModelChange)="projectStore.setProjectName($event)"
                  placeholder="Project name"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 text-xs" />
              </div>
              <div>
                <span class="text-[10px] text-slate-500 mb-0.5 block">{{ 'header.nodeName' | translate }}</span>
                <input
                  type="text"
                  [ngModel]="projectStore.project().nodeName"
                  (ngModelChange)="projectStore.setNodeName($event)"
                  [placeholder]="'header.nodeNamePlaceholder' | translate"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-300 font-mono focus:outline-none focus:border-sky-500 text-xs" />
              </div>
            </div>
          </div>

          <!-- 2. Grid & Snapping -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Grid & Bounds</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="text-[10px] text-slate-500 mb-0.5 block">{{ 'header.snap' | translate }}</span>
                <select
                  [ngModel]="projectStore.project().snapResolution"
                  (ngModelChange)="projectStore.setSnapResolution($event)"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-slate-200 text-xs font-mono">
                  <option [value]="16">1/16 Grid</option>
                  <option [value]="32">1/32 Grid</option>
                  <option [value]="64">1/64 Grid</option>
                </select>
              </div>
              <div>
                <span class="text-[10px] text-slate-500 mb-0.5 block">{{ 'header.height' | translate }}</span>
                <select
                  [ngModel]="projectStore.project().nodeHeight"
                  (ngModelChange)="projectStore.setNodeHeight(+$event)"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-slate-200 text-xs font-mono">
                  <option [value]="1">1 Node High</option>
                  <option [value]="2">2 Nodes High</option>
                </select>
              </div>
            </div>
            <div class="mt-2">
              <span class="text-[10px] text-slate-500 mb-0.5 block">Nodebox Type</span>
              <select
                [ngModel]="projectStore.project().nodeboxType"
                (ngModelChange)="projectStore.setNodeboxType($event)"
                class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-sky-400 text-xs font-semibold capitalize">
                <option value="fixed">Fixed</option>
                <option value="connected">Connected</option>
                <option value="wallmounted">Wallmounted</option>
                <option value="leveled">Leveled</option>
                <option value="regular">Regular</option>
              </select>
            </div>
          </div>

          <!-- 3. Presets & Presentation -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Templates & Presentation</label>
            <div class="flex flex-col gap-2">
              <button
                (click)="openPresets.emit(); closeMobileMenu()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideGrid3x3 class="w-4 h-4 text-sky-400"></svg>
                  {{ 'header.presets' | translate }}
                </span>
                <svg lucideChevronRight class="w-3.5 h-3.5 text-slate-500"></svg>
              </button>

              <button
                (click)="projectStore.toggleRenderMode(true); closeMobileMenu()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideEye class="w-4 h-4 text-amber-400"></svg>
                  {{ 'header.renderMode' | translate }}
                </span>
                <svg lucideChevronRight class="w-3.5 h-3.5 text-amber-400"></svg>
              </button>
            </div>
          </div>

          <!-- 4. Save & Load Project -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Project Storage</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                (click)="exportProjectJson(); closeMobileMenu()"
                class="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition font-medium">
                <svg lucideDownload class="w-4 h-4 text-sky-400"></svg>
                {{ 'header.saveJson' | translate }}
              </button>

              <label class="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition font-medium cursor-pointer">
                <svg lucideUpload class="w-4 h-4 text-emerald-400"></svg>
                {{ 'header.loadJson' | translate }}
                <input type="file" accept=".json" (change)="importProjectJson($event); closeMobileMenu()" class="hidden" />
              </label>
            </div>

            <button
              (click)="confirmReset(); closeMobileMenu()"
              class="w-full p-2.5 rounded-lg bg-red-950/20 hover:bg-red-900/30 border border-red-800/40 text-red-300 flex items-center justify-center gap-1.5 transition mt-2 font-medium">
              <span>{{ 'header.newProject' | translate }}</span>
            </button>
          </div>

          <!-- 5. Appearance & Shortcuts -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Preferences</label>
            <div class="flex flex-col gap-2">
              <button
                (click)="themeService.toggleTheme()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition">
                <span class="flex items-center gap-2 font-medium">
                  @if (themeService.theme() === 'dark') {
                    <svg lucideSun class="w-4 h-4 text-amber-400"></svg>
                    <span>{{ 'header.themeLight' | translate }}</span>
                  } @else {
                    <svg lucideMoon class="w-4 h-4 text-sky-400"></svg>
                    <span>{{ 'header.themeDark' | translate }}</span>
                  }
                </span>
              </button>

              <button
                (click)="shortcutsService.openShortcutsModal(); closeMobileMenu()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideKeyboard class="w-4 h-4 text-sky-400"></svg>
                  <span>{{ 'header.shortcuts' | translate }}</span>
                </span>
                <span class="text-slate-500">?</span>
              </button>
            </div>
          </div>

          <!-- 6. Install App PWA -->
          @if (canInstallPwa()) {
            <div class="pt-2 border-t border-slate-800">
              <button
                (click)="installPwa(); closeMobileMenu()"
                class="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium flex items-center justify-center gap-2 shadow-md transition">
                <svg lucideDownload class="w-4 h-4"></svg>
                <span>{{ 'header.installApp' | translate }}</span>
              </button>
            </div>
          }

          <!-- 7. App Updates & Cache -->
          <div class="space-y-2 pt-2 border-t border-slate-800">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">App Updates & Cache</label>
            <div class="flex flex-col gap-2">
              @if (pwaUpdateService.updateAvailable()) {
                <button
                  (click)="pwaUpdateService.activateUpdate(); closeMobileMenu()"
                  class="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-medium flex items-center justify-between shadow-md transition active:scale-95">
                  <span class="flex items-center gap-2">
                    <svg lucideSparkles class="w-4 h-4"></svg>
                    <span>{{ 'header.updateNow' | translate }}</span>
                  </span>
                  <svg lucideRefreshCw class="w-3.5 h-3.5 animate-spin"></svg>
                </button>
              }

              <button
                (click)="pwaUpdateService.checkForUpdate(true)"
                [disabled]="pwaUpdateService.checkingForUpdate()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700/80 transition text-slate-300 disabled:opacity-60">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideRefreshCw class="w-4 h-4 text-sky-400" [class.animate-spin]="pwaUpdateService.checkingForUpdate()"></svg>
                  <span>
                    @if (pwaUpdateService.checkingForUpdate()) {
                      {{ 'header.checkingUpdates' | translate }}
                    } @else if (pwaUpdateService.statusMessage()) {
                      {{ pwaUpdateService.statusMessage()! | translate }}
                    } @else {
                      {{ 'header.checkForUpdates' | translate }}
                    }
                  </span>
                </span>
              </button>

              <button
                (click)="confirmClearCache(); closeMobileMenu()"
                class="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-red-950/20 border border-slate-800 hover:border-red-800/40 text-slate-400 hover:text-red-300 transition text-[11px]">
                <span class="flex items-center gap-2 font-medium">
                  <svg lucideTrash2 class="w-3.5 h-3.5 text-slate-500"></svg>
                  <span>{{ 'header.clearCache' | translate }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class HeaderComponent {
  @Output() openPresets = new EventEmitter<void>();
  @Output() openHelp = new EventEmitter<void>();
  @Output() openShare = new EventEmitter<void>();

  public projectStore = inject(ProjectStore);
  public shortcutsService = inject(KeyboardShortcutsService);
  public themeService = inject(ThemeService);
  public translationService = inject(TranslationService);
  public pwaUpdateService = inject(PwaUpdateService);

  public canInstallPwa = signal<boolean>(false);
  public showMobileMenu = signal<boolean>(false);
  public showDesktopUpdatesMenu = signal<boolean>(false);
  private deferredPrompt: any = null;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: any): void {
    event.preventDefault();
    this.deferredPrompt = event;
    this.canInstallPwa.set(true);
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.showMobileMenu()) {
      this.closeMobileMenu();
    }
    if (this.showDesktopUpdatesMenu()) {
      this.closeDesktopUpdatesMenu();
    }
  }

  toggleDesktopUpdatesMenu(): void {
    this.showDesktopUpdatesMenu.update((v) => !v);
  }

  closeDesktopUpdatesMenu(): void {
    this.showDesktopUpdatesMenu.set(false);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.showMobileMenu.set(false);
  }

  installPwa(): void {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(() => {
      this.deferredPrompt = null;
      this.canInstallPwa.set(false);
    });
  }

  confirmReset(): void {
    const msg = this.translationService.t('header.resetConfirmMessage');
    if (confirm(msg)) {
      this.projectStore.resetProject();
    }
  }

  confirmClearCache(): void {
    const msg = this.translationService.t('header.clearCacheConfirm');
    if (confirm(msg)) {
      this.pwaUpdateService.forceClearCacheAndReload();
    }
  }

  exportProjectJson(): void {
    const data = JSON.stringify(this.projectStore.project(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.projectStore.project().nodeName.replace(':', '_') || 'nodebox'}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importProjectJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as NodeboxProject;
        if (parsed && Array.isArray(parsed.boxes)) {
          this.projectStore.loadProject(parsed);
        }
      } catch {
        alert('Invalid JSON project file.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }
}
