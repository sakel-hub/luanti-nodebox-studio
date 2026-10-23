import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectStore } from '../../core/state/project.store';
import { TextureService } from '../../core/services/texture.service';
import { FaceDirection, LUANTI_FACE_DIRECTIONS } from '../../core/models/nodebox.model';

export type TextureTarget = 'global' | 'box';

@Component({
  selector: 'app-texture-studio',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-xs select-none overflow-y-auto">
      <!-- Panel Header -->
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <span class="font-semibold text-slate-200">Face Textures</span>

        <!-- Scope Switch (Global vs Selected Box) -->
        <div class="flex bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            (click)="targetScope.set('global')"
            [class.bg-sky-600]="targetScope() === 'global'"
            [class.text-white]="targetScope() === 'global'"
            [class.text-slate-400]="targetScope() !== 'global'"
            class="px-2 py-0.5 rounded text-[11px] font-medium transition">
            Global
          </button>
          <button
            (click)="targetScope.set('box')"
            [class.bg-sky-600]="targetScope() === 'box'"
            [class.text-white]="targetScope() === 'box'"
            [class.text-slate-400]="targetScope() !== 'box'"
            [disabled]="!projectStore.selectedBox()"
            class="px-2 py-0.5 rounded text-[11px] font-medium transition disabled:opacity-40">
            Selected Box
          </button>
        </div>
      </div>

      <div class="p-3 space-y-4">
        <!-- Scope Context Banner -->
        @if (targetScope() === 'box') {
          <div class="bg-sky-950/50 border border-sky-800/60 p-2 rounded flex items-center justify-between text-[11px]">
            <span class="text-sky-300">
              Editing: <strong>{{ projectStore.selectedBox()?.name }}</strong>
            </span>
            <button
              (click)="clearBoxTextures()"
              class="text-sky-400 hover:text-sky-200 underline font-medium">
              Reset to Global
            </button>
          </div>
        }

        <!-- Luanti 6-Face Mapping Cards -->
        <div class="space-y-2">
          <div class="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Luanti 6 Faces (Index 1 &rarr; 6)
          </div>

          <div class="grid grid-cols-2 gap-2">
            @for (dir of faceDirections; track dir; let idx = $index) {
              <div
                (click)="selectedFace.set(dir)"
                [class.ring-2]="selectedFace() === dir"
                [class.ring-sky-500]="selectedFace() === dir"
                [class.bg-slate-950]="selectedFace() === dir"
                class="bg-slate-950/70 p-2 rounded border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center gap-2">
                <!-- Thumbnail -->
                <div class="w-8 h-8 rounded border border-slate-700 overflow-hidden flex-shrink-0 bg-slate-900">
                  <img
                    [src]="getFaceTextureUrl(dir)"
                    [alt]="dir"
                    class="w-full h-full object-cover [image-rendering:pixelated]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold text-slate-200 capitalize">{{ dir }}</span>
                    <span class="text-[10px] text-slate-500 font-mono">#{{ idx + 1 }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">
                    {{ getFaceAxisName(dir) }}
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Texture Palette Picker -->
        <div class="space-y-2">
          <div class="flex justify-between items-center text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            <span>Texture Palette</span>
            <button
              (click)="applyActiveTextureToAll()"
              class="text-[10px] text-sky-400 hover:text-sky-300 font-medium lowercase">
              Apply to all faces
            </button>
          </div>

          <div class="grid grid-cols-4 gap-2">
            @for (tex of textureService.textures(); track tex.id) {
              <button
                (click)="assignTextureToCurrentFace(tex.id)"
                [title]="tex.name + ' (' + tex.id + ')'"
                class="group p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 rounded flex flex-col items-center gap-1 transition">
                <div class="w-10 h-10 rounded border border-slate-700 overflow-hidden bg-slate-900 group-hover:scale-105 transition">
                  <img
                    [src]="tex.dataUrl"
                    [alt]="tex.name"
                    class="w-full h-full object-cover [image-rendering:pixelated]" />
                </div>
                <span class="text-[10px] text-slate-300 truncate w-full text-center">{{ tex.name }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Custom Texture Upload -->
        <div class="pt-2 border-t border-slate-800 space-y-2">
          <div class="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Custom Texture
          </div>

          <label class="block w-full border-2 border-dashed border-slate-700 hover:border-sky-500 p-3 rounded-lg text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-900">
            <svg class="w-6 h-6 mx-auto mb-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-[11px] text-slate-300 font-medium block">Upload PNG / JPG texture</span>
            <span class="text-[10px] text-slate-500 block">Saved locally in browser offline storage</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              (change)="onFileUpload($event)"
              class="hidden" />
          </label>
        </div>
      </div>
    </div>
  `
})
export class TextureStudioComponent {
  public projectStore = inject(ProjectStore);
  public textureService = inject(TextureService);

  public targetScope = signal<TextureTarget>('global');
  public selectedFace = signal<FaceDirection>('top');
  public readonly faceDirections = LUANTI_FACE_DIRECTIONS;

  getFaceTextureUrl(dir: FaceDirection): string {
    const scope = this.targetScope();
    let texKey: string;

    if (scope === 'box') {
      const box = this.projectStore.selectedBox();
      texKey = box?.textures?.[dir] || this.projectStore.project().globalTextures[dir];
    } else {
      texKey = this.projectStore.project().globalTextures[dir];
    }

    const tex = this.textureService.getTextureById(texKey);
    return tex?.dataUrl || '';
  }

  getFaceAxisName(dir: FaceDirection): string {
    switch (dir) {
      case 'top': return '+Y (Up)';
      case 'bottom': return '-Y (Down)';
      case 'right': return '+X (East)';
      case 'left': return '-X (West)';
      case 'back': return '+Z (North)';
      case 'front': return '-Z (South)';
    }
  }

  assignTextureToCurrentFace(textureId: string): void {
    const face = this.selectedFace();
    if (this.targetScope() === 'global') {
      this.projectStore.setGlobalTexture(face, textureId);
    } else {
      const box = this.projectStore.selectedBox();
      if (box) {
        this.projectStore.setBoxFaceTexture(box.id, face, textureId);
      }
    }
  }

  applyActiveTextureToAll(): void {
    const face = this.selectedFace();
    const currentTexId = this.targetScope() === 'global'
      ? this.projectStore.project().globalTextures[face]
      : this.projectStore.selectedBox()?.textures?.[face] || this.projectStore.project().globalTextures[face];

    if (this.targetScope() === 'global') {
      this.projectStore.setGlobalAllTextures(currentTexId);
    } else {
      const box = this.projectStore.selectedBox();
      if (box) {
        this.projectStore.setBoxAllFacesTexture(box.id, currentTexId);
      }
    }
  }

  clearBoxTextures(): void {
    const box = this.projectStore.selectedBox();
    if (box) {
      this.projectStore.clearBoxTextures(box.id);
    }
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newTex = this.textureService.addCustomTexture(file.name, dataUrl);
      this.assignTextureToCurrentFace(newTex.id);
    };
    reader.readAsDataURL(file);
  }
}
