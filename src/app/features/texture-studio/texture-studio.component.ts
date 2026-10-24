import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectStore } from '../../core/state/project.store';
import { TextureService } from '../../core/services/texture.service';
import { FaceDirection, LUANTI_FACE_DIRECTIONS } from '../../core/models/nodebox.model';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-texture-studio',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `
    <div class="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-xs select-none overflow-y-auto">
      <!-- Panel Header -->
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <span class="font-semibold text-slate-200">Face Textures</span>
      </div>

      <div class="p-3 space-y-4">
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
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="font-semibold text-slate-200 capitalize truncate">{{ dir }}</span>
                      @if (isFaceFlipped(dir)) {
                        <span class="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/80 font-mono font-bold leading-tight flex-shrink-0">
                          FX
                        </span>
                      }
                    </div>
                    <span class="text-[10px] text-slate-500 font-mono flex-shrink-0">#{{ idx + 1 }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">
                    {{ getFaceAxisName(dir) }}
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Flip X Control for Selected Face -->
          <div class="flex items-center justify-between p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px]">
            <span class="text-slate-300 truncate mr-2">
              Flip X for <strong class="text-sky-400 capitalize">{{ selectedFace() }}</strong>
              <span class="text-slate-500 text-[10px] ml-1">({{ getFaceAxisName(selectedFace()) }})</span>
            </span>

            <button
              (click)="toggleFlipX()"
              [class.bg-sky-600]="isCurrentFaceFlipped()"
              [class.text-white]="isCurrentFaceFlipped()"
              [class.border-sky-500]="isCurrentFaceFlipped()"
              [class.bg-slate-900]="!isCurrentFaceFlipped()"
              [class.text-slate-300]="!isCurrentFaceFlipped()"
              [class.border-slate-700]="!isCurrentFaceFlipped()"
              [appTooltip]="'Flip texture horizontally across X axis (Luanti: ^[transformFX)'"
              appTooltipPlacement="top"
              class="px-2.5 py-1 rounded text-[11px] font-medium border hover:border-slate-500 transition flex items-center gap-1.5 shadow-sm flex-shrink-0">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 7 5 5-5 5V7"/>
                <path d="m21 7-5 5 5 5V7"/>
                <path d="M12 20v2"/>
                <path d="M12 14v2"/>
                <path d="M12 8v2"/>
                <path d="M12 2v2"/>
              </svg>
              <span>Flip X</span>
              <span class="font-mono text-[9px] opacity-75 font-normal">^[transformFX</span>
            </button>
          </div>
        </div>

        <!-- Texture Palette Picker -->
        <div class="space-y-2">
          <div class="flex justify-between items-center text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            <span>Texture Palette</span>
            <div class="flex items-center gap-2">
              <button
                (click)="cleanUnusedTextures()"
                [disabled]="unusedCustomCount() === 0"
                [appTooltip]="'Remove custom textures not currently used on any face in this project'"
                appTooltipPlacement="top"
                class="text-[10px] text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:hover:text-amber-400 font-medium transition">
                Clean unused ({{ unusedCustomCount() }})
              </button>
              <span class="text-slate-700">|</span>
              <button
                (click)="applyActiveTextureToAll()"
                class="text-[10px] text-sky-400 hover:text-sky-300 font-medium lowercase">
                Apply to all faces
              </button>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2">
            @for (tex of textureService.textures(); track tex.id) {
              <div class="relative group">
                <button
                  (click)="assignTextureToCurrentFace(tex.id)"
                  [appTooltip]="tex.name + ' (' + tex.id + ')' + (tex.author ? ' • ' + tex.author + ' (' + tex.license + ')' : '')"
                  appTooltipPlacement="top"
                  class="w-full p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 rounded flex flex-col items-center gap-1 transition">
                  <div class="w-10 h-10 rounded border border-slate-700 overflow-hidden bg-slate-900 group-hover:scale-105 transition">
                    <img
                      [src]="tex.dataUrl"
                      [alt]="tex.name"
                      class="w-full h-full object-cover [image-rendering:pixelated]" />
                  </div>
                  <span class="text-[10px] text-slate-300 truncate w-full text-center">{{ tex.name }}</span>
                </button>

                @if (tex.isCustom) {
                  <button
                    (click)="deleteTexture($event, tex.id)"
                    [appTooltip]="'Delete ' + tex.name"
                    appTooltipPlacement="top"
                    class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition shadow">
                    &times;
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Custom Texture Upload -->
        <div class="pt-2 border-t border-slate-800 space-y-2">
          <div class="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Custom Texture
          </div>

          <label
            (dragover)="onDragOver($event)"
            (dragenter)="onDragEnter($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDrop($event)"
            [class.border-sky-400]="isDraggingOver()"
            [class.bg-sky-950/50]="isDraggingOver()"
            [class.ring-2]="isDraggingOver()"
            [class.ring-sky-500/50]="isDraggingOver()"
            class="block w-full border-2 border-dashed border-slate-700 hover:border-sky-500 p-3 rounded-lg text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-900">
            <svg
              [class.text-sky-400]="isDraggingOver()"
              [class.text-slate-400]="!isDraggingOver()"
              class="w-6 h-6 mx-auto mb-1 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span
              [class.text-sky-300]="isDraggingOver()"
              [class.text-slate-300]="!isDraggingOver()"
              class="text-[11px] font-medium block">
              {{ isDraggingOver() ? 'Drop image here to upload' : 'Upload PNG / JPG texture' }}
            </span>
            <span class="text-[10px] text-slate-500 block">Drag & drop or click to browse</span>
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

  public selectedFace = signal<FaceDirection>('top');
  public readonly faceDirections = LUANTI_FACE_DIRECTIONS;
  public isDraggingOver = signal<boolean>(false);

  public unusedCustomCount = computed(() => {
    const usedBaseIds = this.projectStore.getUsedTextureBaseIds();
    return this.textureService.textures().filter(t => t.isCustom && !usedBaseIds.has(t.id)).length;
  });

  // Prevent browser window from opening image files when dropped outside the dropzone
  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  getFaceTextureKey(dir: FaceDirection): string {
    return this.projectStore.project().globalTextures[dir] || 'default_wood.png';
  }

  isFaceFlipped(dir: FaceDirection): boolean {
    return this.getFaceTextureKey(dir).endsWith('^[transformFX');
  }

  isCurrentFaceFlipped(): boolean {
    return this.isFaceFlipped(this.selectedFace());
  }

  async toggleFlipX(): Promise<void> {
    const face = this.selectedFace();
    const currentKey = this.getFaceTextureKey(face);
    const isFlipped = currentKey.endsWith('^[transformFX');
    const newKey = isFlipped
      ? currentKey.replace(/\^\[transformFX$/, '')
      : `${currentKey}^[transformFX`;

    await this.textureService.ensureTransformedTexture(newKey);
    this.projectStore.setGlobalTexture(face, newKey);
  }

  getFaceTextureUrl(dir: FaceDirection): string {
    const texKey = this.getFaceTextureKey(dir);
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

  async assignTextureToCurrentFace(textureId: string): Promise<void> {
    const face = this.selectedFace();
    const isFlipped = this.isCurrentFaceFlipped();
    const newKey = isFlipped ? `${textureId}^[transformFX` : textureId;

    if (isFlipped) {
      await this.textureService.ensureTransformedTexture(newKey);
    }
    this.projectStore.setGlobalTexture(face, newKey);
  }

  applyActiveTextureToAll(): void {
    const face = this.selectedFace();
    const currentTexId = this.getFaceTextureKey(face);
    this.projectStore.setGlobalAllTextures(currentTexId);
  }

  deleteTexture(event: MouseEvent, textureId: string): void {
    event.stopPropagation();
    const usedBaseIds = this.projectStore.getUsedTextureBaseIds();
    if (usedBaseIds.has(textureId)) {
      this.projectStore.replaceTextureUsage(textureId, 'default_wood.png');
    }
    this.textureService.deleteCustomTexture(textureId);
  }

  cleanUnusedTextures(): void {
    const usedBaseIds = this.projectStore.getUsedTextureBaseIds();
    this.textureService.cleanUnusedCustomTextures(usedBaseIds);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDraggingOver.set(true);
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processFiles(Array.from(input.files));
    input.value = '';
  }

  private processFiles(files: File[]): void {
    const imageFiles = files.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name));
    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newTex = this.textureService.addCustomTexture(file.name, dataUrl);
        this.assignTextureToCurrentFace(newTex.id);
      };
      reader.readAsDataURL(file);
    }
  }
}
