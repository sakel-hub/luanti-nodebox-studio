import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import { TextureService, TextureDefinition } from '../../core/services/texture.service';
import { FaceDirection, LUANTI_FACE_DIRECTIONS } from '../../core/models/nodebox.model';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-texture-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective],
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
                  [appTooltip]="tex.name + ' (' + tex.id + ')' + (tex.animation ? ' • Animated Sheet (' + (tex.animation.frameCount || 'V') + ' frames)' : '') + (tex.author ? ' • ' + tex.author + ' (' + tex.license + ')' : '')"
                  appTooltipPlacement="top"
                  class="w-full p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-sky-500 rounded flex flex-col items-center gap-1 transition relative">
                  <div class="w-10 h-10 rounded border border-slate-700 overflow-hidden bg-slate-900 group-hover:scale-105 transition relative">
                    <img
                      [src]="tex.dataUrl"
                      [alt]="tex.name"
                      class="w-full h-full object-cover [image-rendering:pixelated]" />
                    @if (tex.animation) {
                      <span class="absolute top-0.5 left-0.5 px-1 py-0.2 bg-amber-500 text-slate-950 font-bold text-[8px] font-mono rounded shadow leading-none">
                        ANIM
                      </span>
                    }
                  </div>
                  <span class="text-[10px] text-slate-300 truncate w-full text-center">{{ tex.name }}</span>
                </button>

                <!-- Animation Settings Button -->
                <button
                  type="button"
                  (click)="openAnimationModal($event, tex)"
                  [appTooltip]="'Configure animation sheet (' + (tex.animation ? 'Active' : 'Static') + ')'"
                  appTooltipPlacement="top"
                  class="absolute bottom-6 right-1 w-4 h-4 rounded-full bg-slate-900/90 hover:bg-sky-600 text-slate-300 hover:text-white flex items-center justify-center text-[9px] border border-slate-700 opacity-0 group-hover:opacity-100 transition shadow z-10">
                  🎬
                </button>

                @if (tex.isCustom) {
                  <button
                    (click)="deleteTexture($event, tex.id)"
                    [appTooltip]="'Delete ' + tex.name"
                    appTooltipPlacement="top"
                    class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition shadow z-10">
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

      <!-- Luanti Animated Texture Sheet Config Modal -->
      @if (editingTexture(); as targetTex) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true">
          <div
            class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] text-slate-200">
            <!-- Modal Header -->
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div class="flex items-center gap-2">
                <span class="text-base">🎬</span>
                <div>
                  <h3 class="font-semibold text-xs text-white">Animated Texture Sheet</h3>
                  <p class="text-[10px] text-slate-400 truncate max-w-[200px]">{{ targetTex.name }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="closeAnimationModal()"
                class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                &times;
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4 space-y-4 overflow-y-auto min-h-0 text-xs">
              <!-- Enable Toggle -->
              <label class="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span class="font-medium text-slate-200">Luanti Vertical Frames</span>
                  <p class="text-[10px] text-slate-500">animation.type = "vertical_frames"</p>
                </div>
                <input
                  type="checkbox"
                  [checked]="isAnimEnabled()"
                  (change)="isAnimEnabled.set($any($event.target).checked)"
                  class="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500 cursor-pointer" />
              </label>

              @if (isAnimEnabled()) {
                <!-- Live Interactive Preview -->
                <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center gap-2">
                  <div class="w-16 h-16 rounded border border-slate-700 bg-slate-900 overflow-hidden relative shadow-inner">
                    <div
                      class="w-full h-full [image-rendering:pixelated]"
                      [style.background-image]="'url(' + targetTex.dataUrl + ')'"
                      [style.background-size]="'100% ' + (computedTotalFrames() * 100) + '%'"
                      [style.background-position]="'0% ' + (computedTotalFrames() > 1 ? (currentPreviewFrame() / (computedTotalFrames() - 1) * 100) : 0) + '%'"
                      [style.background-repeat]="'no-repeat'">
                    </div>
                  </div>

                  <!-- Playback & Frame Scrubber -->
                  <div class="w-full space-y-1">
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Frame {{ currentPreviewFrame() + 1 }} / {{ computedTotalFrames() }}</span>
                      <span>{{ computedFPS() }} FPS</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="togglePlayback()"
                        class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-200 transition">
                        {{ isPlaying() ? '⏸ Pause' : '▶ Play' }}
                      </button>
                      <input
                        type="range"
                        min="0"
                        [max]="computedTotalFrames() - 1"
                        [value]="currentPreviewFrame()"
                        (input)="onScrubFrame($event)"
                        class="flex-1 accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded" />
                    </div>
                  </div>
                </div>

                <!-- Frame Size Dimensions -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-[11px] font-medium text-slate-300">
                    <span>Frame Dimensions (aspect_w &times; aspect_h)</span>
                    <span class="text-slate-500 text-[10px]">Image: {{ imageNaturalWidth() }}&times;{{ imageNaturalHeight() }}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-[10px] text-slate-400 block mb-0.5">Width (px)</label>
                      <input
                        type="number"
                        min="1"
                        max="512"
                        [value]="editAspectW()"
                        (input)="editAspectW.set(+$any($event.target).value)"
                        class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:border-sky-500 focus:outline-none" />
                    </div>
                    <div>
                      <label class="text-[10px] text-slate-400 block mb-0.5">Height (px)</label>
                      <input
                        type="number"
                        min="1"
                        max="512"
                        [value]="editAspectH()"
                        (input)="editAspectH.set(+$any($event.target).value)"
                        class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono focus:border-sky-500 focus:outline-none" />
                    </div>
                  </div>

                  <!-- Quick Dimension Presets -->
                  <div class="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      (click)="setQuickAspect(16, 16)"
                      class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300">
                      16&times;16
                    </button>
                    <button
                      type="button"
                      (click)="setQuickAspect(32, 32)"
                      class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300">
                      32&times;32
                    </button>
                    <button
                      type="button"
                      (click)="setQuickAspect(64, 64)"
                      class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300">
                      64&times;64
                    </button>
                  </div>
                </div>

                <!-- Animation Duration / Speed -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[11px] font-medium text-slate-300">
                    <span>Loop Duration (seconds)</span>
                    <span class="text-sky-400 font-mono font-bold">{{ editLength() }}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    [value]="editLength()"
                    (input)="editLength.set(+$any($event.target).value)"
                    class="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded" />
                </div>

                <!-- Engine Flags: Backface Culling -->
                <label class="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    [checked]="!editBackfaceCulling()"
                    (change)="editBackfaceCulling.set(!$any($event.target).checked)"
                    class="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500" />
                  <div>
                    <span class="text-slate-200">Render Two-Sided (backface_culling = false)</span>
                    <p class="text-[10px] text-slate-500">Recommended for flames, foliage, and internal faces</p>
                  </div>
                </label>
              }
            </div>

            <!-- Modal Actions -->
            <div class="px-4 py-3 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <button
                type="button"
                (click)="closeAnimationModal()"
                class="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-xs font-medium">
                Cancel
              </button>
              <button
                type="button"
                (click)="saveAnimationSettings()"
                class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition text-xs font-medium shadow-sm">
                Apply Animation
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TextureStudioComponent implements OnDestroy {
  public projectStore = inject(ProjectStore);
  public textureService = inject(TextureService);

  public selectedFace = signal<FaceDirection>('top');
  public readonly faceDirections = LUANTI_FACE_DIRECTIONS;
  public isDraggingOver = signal<boolean>(false);

  // Animation sheet configuration state
  public editingTexture = signal<TextureDefinition | null>(null);
  public isAnimEnabled = signal<boolean>(false);
  public editAspectW = signal<number>(16);
  public editAspectH = signal<number>(16);
  public editLength = signal<number>(1.0);
  public editBackfaceCulling = signal<boolean>(false);
  public imageNaturalWidth = signal<number>(16);
  public imageNaturalHeight = signal<number>(16);
  public currentPreviewFrame = signal<number>(0);
  public isPlaying = signal<boolean>(true);
  private previewAnimRaf: number | null = null;

  public computedTotalFrames = computed(() => {
    const h = this.imageNaturalHeight();
    const ah = this.editAspectH() || 16;
    return Math.max(1, Math.floor(h / ah));
  });

  public computedFPS = computed(() => {
    const frames = this.computedTotalFrames();
    const len = this.editLength() || 1.0;
    return (frames / len).toFixed(1);
  });

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

  openAnimationModal(event: MouseEvent, tex: TextureDefinition): void {
    event.stopPropagation();
    this.editingTexture.set(tex);
    const anim = tex.animation;
    this.isAnimEnabled.set(!!anim);
    this.editAspectW.set(anim?.aspect_w || 16);
    this.editAspectH.set(anim?.aspect_h || 16);
    this.editLength.set(anim?.length || 1.0);
    this.editBackfaceCulling.set(tex.backfaceCulling ?? false);
    this.isPlaying.set(true);
    this.currentPreviewFrame.set(0);

    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.onload = () => {
        this.imageNaturalWidth.set(img.naturalWidth || 16);
        this.imageNaturalHeight.set(img.naturalHeight || 16);
        if (!anim && img.naturalHeight > img.naturalWidth && img.naturalHeight % img.naturalWidth === 0) {
          this.isAnimEnabled.set(true);
          this.editAspectW.set(img.naturalWidth);
          this.editAspectH.set(img.naturalWidth);
        }
      };
      img.src = tex.dataUrl;
    }

    this.startPreviewTicker();
  }

  closeAnimationModal(): void {
    this.stopPreviewTicker();
    this.editingTexture.set(null);
  }

  saveAnimationSettings(): void {
    const target = this.editingTexture();
    if (!target) return;

    if (this.isAnimEnabled()) {
      const frames = this.computedTotalFrames();
      this.textureService.updateTextureProperties(target.id, {
        animation: {
          type: 'vertical_frames',
          aspect_w: this.editAspectW() || 16,
          aspect_h: this.editAspectH() || 16,
          length: this.editLength() || 1.0,
          frameCount: frames
        },
        backfaceCulling: this.editBackfaceCulling()
      });
    } else {
      this.textureService.updateTextureProperties(target.id, {
        animation: undefined,
        backfaceCulling: undefined
      });
    }

    this.closeAnimationModal();
  }

  togglePlayback(): void {
    this.isPlaying.update(p => !p);
  }

  onScrubFrame(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.isPlaying.set(false);
    this.currentPreviewFrame.set(parseInt(target.value, 10) || 0);
  }

  setQuickAspect(w: number, h: number): void {
    this.editAspectW.set(w);
    this.editAspectH.set(h);
  }

  private startPreviewTicker(): void {
    this.stopPreviewTicker();
    if (typeof requestAnimationFrame === 'undefined') return;

    const tick = (now: number) => {
      if (this.editingTexture() && this.isPlaying()) {
        const total = this.computedTotalFrames();
        const len = this.editLength() || 1.0;
        const elapsed = (now / 1000) % len;
        const frame = Math.floor((elapsed / len) * total);
        this.currentPreviewFrame.set(frame);
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        this.previewAnimRaf = requestAnimationFrame(tick);
      }
    };
    this.previewAnimRaf = requestAnimationFrame(tick);
  }

  private stopPreviewTicker(): void {
    if (this.previewAnimRaf !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.previewAnimRaf);
      }
      this.previewAnimRaf = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPreviewTicker();
  }

  private async processFiles(files: File[]): Promise<void> {
    const imageFiles = files.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name));
    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const detected = await this.textureService.detectTextureProperties(dataUrl);
        const newTex = this.textureService.addCustomTexture(file.name, dataUrl, {
          animation: detected.animation,
          backfaceCulling: detected.animation ? false : undefined
        });
        this.assignTextureToCurrentFace(newTex.id);
      };
      reader.readAsDataURL(file);
    }
  }
}
