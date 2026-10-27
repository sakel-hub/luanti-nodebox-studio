import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate, { optional: true });

  public readonly updateAvailable = signal<boolean>(false);
  public readonly checkingForUpdate = signal<boolean>(false);
  public readonly statusMessage = signal<string | null>(null);

  private checkIntervalTimer: any = null;
  private messageClearTimer: any = null;

  constructor() {
    this.initUpdateListeners();
  }

  private initUpdateListeners(): void {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    // 1. Listen for new version downloaded and ready to activate
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
        this.statusMessage.set(null);
      });

    // 2. Periodic background check every 30 minutes
    if (typeof window !== 'undefined') {
      this.checkIntervalTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          this.checkForUpdate(false);
        }
      }, 30 * 60 * 1000);

      // 3. Check for updates whenever returning to the tab / PWA
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdate(false);
        }
      });
    }
  }

  /**
   * Manually check the server for a newer version
   * @param interactive If true, updates checking state and provides status feedback
   */
  async checkForUpdate(interactive = true): Promise<boolean> {
    if (!this.swUpdate?.isEnabled) {
      if (interactive) {
        this.setStatusMessage('header.upToDate');
      }
      return false;
    }

    try {
      if (interactive) {
        this.checkingForUpdate.set(true);
      }

      const hasUpdate = await this.swUpdate.checkForUpdate();
      if (hasUpdate) {
        this.updateAvailable.set(true);
        this.statusMessage.set(null);
      } else if (interactive) {
        this.setStatusMessage('header.upToDate');
      }
      return hasUpdate;
    } catch (err) {
      console.warn('PWA update check failed:', err);
      if (interactive) {
        this.setStatusMessage('header.upToDate');
      }
      return false;
    } finally {
      if (interactive) {
        this.checkingForUpdate.set(false);
      }
    }
  }

  /**
   * Activates the downloaded version and reloads the browser to run new bundles
   */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate?.isEnabled) {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    try {
      await this.swUpdate.activateUpdate();
    } catch (err) {
      console.warn('Could not activate update via SwUpdate, reloading directly:', err);
    } finally {
      if (typeof document !== 'undefined') {
        document.location.reload();
      }
    }
  }

  /**
   * Complete hard-reset: Unregisters all service workers, clears all CacheStorage caches, and reloads
   */
  async forceClearCacheAndReload(): Promise<void> {
    try {
      // 1. Unregister all service workers
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      // 2. Clear all CacheStorage caches
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
    } catch (err) {
      console.warn('Error clearing caches/service workers:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }

  dismissBanner(): void {
    this.updateAvailable.set(false);
  }

  private setStatusMessage(msg: string): void {
    this.statusMessage.set(msg);
    if (this.messageClearTimer) {
      clearTimeout(this.messageClearTimer);
    }
    this.messageClearTimer = setTimeout(() => {
      this.statusMessage.set(null);
    }, 3500);
  }
}
