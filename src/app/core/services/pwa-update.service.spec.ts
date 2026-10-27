import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let service: PwaUpdateService;
  let versionUpdatesSubject: Subject<any>;
  let mockSwUpdate: any;

  beforeEach(() => {
    versionUpdatesSubject = new Subject<any>();
    mockSwUpdate = {
      isEnabled: true,
      versionUpdates: versionUpdatesSubject.asObservable(),
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(true)
    };

    const injector = createEnvironmentInjector([
      PwaUpdateService,
      { provide: SwUpdate, useValue: mockSwUpdate }
    ], null as any);

    service = runInInjectionContext(injector, () => injector.get(PwaUpdateService));
  });

  it('initializes with updateAvailable false', () => {
    expect(service.updateAvailable()).toBe(false);
  });

  it('sets updateAvailable to true when VERSION_READY event is emitted', () => {
    versionUpdatesSubject.next({ type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } });
    expect(service.updateAvailable()).toBe(true);
  });

  it('allows dismissing the banner', () => {
    service.updateAvailable.set(true);
    service.dismissBanner();
    expect(service.updateAvailable()).toBe(false);
  });

  it('calls checkForUpdate on SwUpdate and updates status message', async () => {
    mockSwUpdate.checkForUpdate.mockResolvedValueOnce(false);
    const result = await service.checkForUpdate(true);
    expect(result).toBe(false);
    expect(mockSwUpdate.checkForUpdate).toHaveBeenCalled();
    expect(service.statusMessage()).toBe('header.upToDate');
  });

  it('handles found updates during manual check', async () => {
    mockSwUpdate.checkForUpdate.mockResolvedValueOnce(true);
    const result = await service.checkForUpdate(true);
    expect(result).toBe(true);
    expect(service.updateAvailable()).toBe(true);
  });
});
