import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TextureStudioComponent } from './texture-studio.component';
import { ProjectStore } from '../../core/state/project.store';
import { TextureService } from '../../core/services/texture.service';

describe('TextureStudioComponent', () => {
  let component: TextureStudioComponent;
  let projectStore: ProjectStore;
  let textureService: TextureService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    const injector = createEnvironmentInjector([ProjectStore, TextureService], null as any);
    projectStore = injector.get(ProjectStore);
    textureService = injector.get(TextureService);
    component = runInInjectionContext(injector, () => new TextureStudioComponent());
  });

  it('instantiates correctly with default face set to top', () => {
    expect(component).toBeTruthy();
    expect(component.selectedFace()).toBe('top');
    expect(component.isCurrentFaceFlipped()).toBe(false);
  });

  it('toggles Flip X on the selected face and updates globalTextures', async () => {
    component.selectedFace.set('left');
    expect(component.isFaceFlipped('left')).toBe(false);

    await component.toggleFlipX();
    expect(component.isFaceFlipped('left')).toBe(true);
    expect(projectStore.project().globalTextures.left).toContain('^[transformFX');

    // Toggle off
    await component.toggleFlipX();
    expect(component.isFaceFlipped('left')).toBe(false);
    expect(projectStore.project().globalTextures.left).not.toContain('^[transformFX');
  });

  it('preserves Flip X modifier when assigning a new texture from the palette', async () => {
    component.selectedFace.set('back');
    await component.toggleFlipX();
    expect(component.isFaceFlipped('back')).toBe(true);

    await component.assignTextureToCurrentFace('default_stone.png');
    expect(projectStore.project().globalTextures.back).toBe('default_stone.png^[transformFX');
    expect(component.isFaceFlipped('back')).toBe(true);
  });

  it('accurately counts unused custom textures and cleans them up', () => {
    expect(component.unusedCustomCount()).toBe(0);

    textureService.addCustomTexture('Custom A', 'data:image/png;base64,aaa');
    textureService.addCustomTexture('Custom B', 'data:image/png;base64,bbb');

    // Both are unassigned, so unused count is 2
    expect(component.unusedCustomCount()).toBe(2);

    // Assign Custom A to Top face
    projectStore.setGlobalTexture('top', 'custom_a');
    expect(component.unusedCustomCount()).toBe(1);

    // Clean unused
    component.cleanUnusedTextures();
    expect(component.unusedCustomCount()).toBe(0);
    expect(textureService.getTextureById('custom_a')).toBeDefined();
    expect(textureService.getTextureById('custom_b')).toBeUndefined();
  });

  it('deletes individual custom texture and replaces any active usage with default_wood.png', () => {
    textureService.addCustomTexture('Custom Leaf', 'data:image/png;base64,leaf');
    projectStore.setGlobalTexture('front', 'custom_leaf^[transformFX');

    expect(projectStore.project().globalTextures.front).toBe('custom_leaf^[transformFX');

    const fakeEvent = { stopPropagation: () => {} } as MouseEvent;
    component.deleteTexture(fakeEvent, 'custom_leaf');

    expect(textureService.getTextureById('custom_leaf')).toBeUndefined();
    expect(projectStore.project().globalTextures.front).toBe('default_wood.png^[transformFX');
  });
});
