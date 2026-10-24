import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardShortcutsService } from './keyboard-shortcuts.service';

function createMockKeyEvent(options: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...options
  } as unknown as KeyboardEvent;
}

describe('KeyboardShortcutsService', () => {
  let service: KeyboardShortcutsService;
  let mockStore: any;
  let mockScene: any;

  beforeEach(() => {
    mockStore = {
      selectedBoxId: vi.fn().mockReturnValue('box_1'),
      setSelectedBoxId: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      duplicateBox: vi.fn(),
      removeBox: vi.fn(),
      addBox: vi.fn(),
      toggleBoxVisibility: vi.fn(),
      toggleBoxLock: vi.fn(),
      nudgeBox: vi.fn(),
      isRenderMode: vi.fn().mockReturnValue(false),
      toggleRenderMode: vi.fn(),
    };

    mockScene = {
      setGizmoMode: vi.fn(),
      resetCamera: vi.fn(),
      toggleGrid: vi.fn(),
      toggleCage: vi.fn(),
      toggleCameraMode: vi.fn(),
      showGrid: true,
      showCage: true,
    };

    service = new KeyboardShortcutsService();
    service.setDependencies(mockStore, mockScene);
  });

  it('provides formatted shortcut keys according to OS', () => {
    const undoShortcut = service.getShortcut('edit_undo');
    expect(undoShortcut).toBeDefined();
    const formatted = service.getFormattedKey('edit_undo');
    expect(formatted).toBe(service.isMac ? '⌘Z' : 'Ctrl+Z');
  });

  it('triggers gizmo tool changes on W, E, R, T, Q', () => {
    const eventW = createMockKeyEvent({ key: 'w' });
    const handledW = service.handleKeyDown(eventW);
    expect(handledW).toBe(true);
    expect(mockScene.setGizmoMode).toHaveBeenCalledWith('position');

    const eventE = createMockKeyEvent({ key: 'E' });
    const handledE = service.handleKeyDown(eventE);
    expect(handledE).toBe(true);
    expect(mockScene.setGizmoMode).toHaveBeenCalledWith('rotation');

    const eventR = createMockKeyEvent({ key: 'r' });
    service.handleKeyDown(eventR);
    expect(mockScene.setGizmoMode).toHaveBeenCalledWith('scale');

    const eventT = createMockKeyEvent({ key: 'T' });
    service.handleKeyDown(eventT);
    expect(mockScene.setGizmoMode).toHaveBeenCalledWith('resize');

    const eventQ = createMockKeyEvent({ key: 'q' });
    service.handleKeyDown(eventQ);
    expect(mockScene.setGizmoMode).toHaveBeenCalledWith('none');
  });

  it('bypasses shortcuts when target is an INPUT or TEXTAREA element', () => {
    const fakeInput = { tagName: 'INPUT', isContentEditable: false } as unknown as HTMLElement;
    const event = createMockKeyEvent({ key: 'w', target: fakeInput });

    const handled = service.handleKeyDown(event);
    expect(handled).toBe(false);
    expect(mockScene.setGizmoMode).not.toHaveBeenCalled();
  });

  it('handles undo / redo via modifier + z/y', () => {
    const eventUndo = createMockKeyEvent({ key: 'z', ctrlKey: true });
    service.handleKeyDown(eventUndo);
    expect(mockStore.undo).toHaveBeenCalled();

    const eventRedo = createMockKeyEvent({ key: 'z', ctrlKey: true, shiftKey: true });
    service.handleKeyDown(eventRedo);
    expect(mockStore.redo).toHaveBeenCalled();

    const eventRedoY = createMockKeyEvent({ key: 'y', ctrlKey: true });
    service.handleKeyDown(eventRedoY);
    expect(mockStore.redo).toHaveBeenCalledTimes(2);
  });

  it('toggles shortcuts dialog on ? key', () => {
    expect(service.isShortcutsModalOpen()).toBe(false);
    const event = createMockKeyEvent({ key: '?' });
    service.handleKeyDown(event);
    expect(service.isShortcutsModalOpen()).toBe(true);

    const eventEsc = createMockKeyEvent({ key: 'Escape' });
    service.handleKeyDown(eventEsc);
    expect(service.isShortcutsModalOpen()).toBe(false);
  });

  it('triggers box actions (Delete, Duplicate, Lock, Visibility)', () => {
    const eventDel = createMockKeyEvent({ key: 'Delete' });
    service.handleKeyDown(eventDel);
    expect(mockStore.removeBox).toHaveBeenCalledWith('box_1');

    const eventDup = createMockKeyEvent({ key: 'd', ctrlKey: true });
    service.handleKeyDown(eventDup);
    expect(mockStore.duplicateBox).toHaveBeenCalledWith('box_1');

    const eventVis = createMockKeyEvent({ key: 'h' });
    service.handleKeyDown(eventVis);
    expect(mockStore.toggleBoxVisibility).toHaveBeenCalledWith('box_1');

    const eventLock = createMockKeyEvent({ key: 'l' });
    service.handleKeyDown(eventLock);
    expect(mockStore.toggleBoxLock).toHaveBeenCalledWith('box_1');
  });

  it('handles nudging with arrow keys and Shift + arrow keys', () => {
    const eventLeft = createMockKeyEvent({ key: 'ArrowLeft' });
    service.handleKeyDown(eventLeft);
    expect(mockStore.nudgeBox).toHaveBeenCalledWith('box_1', 'x', -1);

    const eventUpShift = createMockKeyEvent({ key: 'ArrowUp', shiftKey: true });
    service.handleKeyDown(eventUpShift);
    expect(mockStore.nudgeBox).toHaveBeenCalledWith('box_1', 'y', 1);
  });

  it('toggles grid and cage with G and C keys', () => {
    const eventG = createMockKeyEvent({ key: 'g' });
    service.handleKeyDown(eventG);
    expect(mockScene.toggleGrid).toHaveBeenCalled();

    const eventC = createMockKeyEvent({ key: 'c' });
    service.handleKeyDown(eventC);
    expect(mockScene.toggleCage).toHaveBeenCalled();
  });

  it('toggles camera mode with 5 key', () => {
    const event5 = createMockKeyEvent({ key: '5' });
    const handled = service.handleKeyDown(event5);
    expect(handled).toBe(true);
    expect(mockScene.toggleCameraMode).toHaveBeenCalled();
  });

  it('toggles presentation render mode with F10 key', () => {
    const eventF10 = createMockKeyEvent({ key: 'F10' });
    const handled = service.handleKeyDown(eventF10);
    expect(handled).toBe(true);
    expect(mockStore.toggleRenderMode).toHaveBeenCalled();
  });

  it('exits render mode on Escape if render mode is active', () => {
    mockStore.isRenderMode.mockReturnValue(true);
    const eventEsc = createMockKeyEvent({ key: 'Escape' });
    const handled = service.handleKeyDown(eventEsc);
    expect(handled).toBe(true);
    expect(mockStore.toggleRenderMode).toHaveBeenCalledWith(false);
  });

  it('exits render mode on F10 if render mode is active', () => {
    mockStore.isRenderMode.mockReturnValue(true);
    const eventF10 = createMockKeyEvent({ key: 'F10' });
    const handled = service.handleKeyDown(eventF10);
    expect(handled).toBe(true);
    expect(mockStore.toggleRenderMode).toHaveBeenCalledWith(false);
  });

  it('blocks editing shortcuts (W, Delete, N, Nudge) while in Render Mode', () => {
    mockStore.isRenderMode.mockReturnValue(true);

    const eventW = createMockKeyEvent({ key: 'w' });
    expect(service.handleKeyDown(eventW)).toBe(false);
    expect(mockScene.setGizmoMode).not.toHaveBeenCalled();

    const eventDel = createMockKeyEvent({ key: 'Delete' });
    expect(service.handleKeyDown(eventDel)).toBe(false);
    expect(mockStore.removeBox).not.toHaveBeenCalled();

    const eventN = createMockKeyEvent({ key: 'n' });
    expect(service.handleKeyDown(eventN)).toBe(false);
    expect(mockStore.addBox).not.toHaveBeenCalled();

    const eventArrow = createMockKeyEvent({ key: 'ArrowLeft' });
    expect(service.handleKeyDown(eventArrow)).toBe(false);
    expect(mockStore.nudgeBox).not.toHaveBeenCalled();
  });
});
