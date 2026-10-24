export type LocaleId = 'en' | 'sk' | 'de' | 'fr' | 'es' | 'ru';

export interface LocaleMeta {
  id: LocaleId;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { id: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { id: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { id: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { id: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
];

export interface TranslationDictionary {
  common: {
    ok: string;
    cancel: string;
    close: string;
    save: string;
    delete: string;
    copy: string;
    copied: string;
    download: string;
    import: string;
    export: string;
    undo: string;
    redo: string;
    reset: string;
    loading: string;
    edit: string;
    search: string;
    new: string;
    actions: string;
  };
  header: {
    title: string;
    pwaBadge: string;
    projectTitle: string;
    nodeName: string;
    nodeNamePlaceholder: string;
    presets: string;
    renderMode: string;
    shortcuts: string;
    newProject: string;
    snap: string;
    height: string;
    saveJson: string;
    loadJson: string;
    themeDark: string;
    themeLight: string;
    installApp: string;
    help: string;
    share: string;
    github: string;
    menu: string;
    resetConfirmTitle: string;
    resetConfirmMessage: string;
  };
  viewport: {
    cameraAngles: string;
    iso: string;
    top: string;
    bottom: string;
    front: string;
    back: string;
    left: string;
    right: string;
    projection: string;
    ortho: string;
    persp: string;
    shading: string;
    textures: string;
    solid: string;
    wire: string;
    tools: string;
    move: string;
    resize: string;
    scale: string;
    rotate: string;
    selectOff: string;
    cage: string;
    grid: string;
    height1: string;
    height2: string;
    resetView: string;
    screenshot: string;
    turntable: string;
    pixelDepth: string;
  };
  layers: {
    title: string;
    addBox: string;
    duplicate: string;
    lock: string;
    unlock: string;
    hide: string;
    show: string;
    deleteBox: string;
    color: string;
    boxCount: string;
    empty: string;
    moveUp: string;
    moveDown: string;
  };
  inspector: {
    title: string;
    coordinates: string;
    minCoords: string;
    maxCoords: string;
    minX: string;
    minY: string;
    minZ: string;
    maxX: string;
    maxY: string;
    maxZ: string;
    gridUnits: string;
    fractions: string;
    decimals: string;
    nudge: string;
    flip: string;
    rotate90: string;
    rotateCenter: string;
    rotateOrigin: string;
    center: string;
    snapGrid: string;
    noBoxSelected: string;
    lockedWarning: string;
    dimensions: string;
  };
  textureStudio: {
    title: string;
    faces: string;
    faceTop: string;
    faceBottom: string;
    faceRight: string;
    faceLeft: string;
    faceBack: string;
    faceFront: string;
    flipX: string;
    customTextures: string;
    upload: string;
    dropNotice: string;
    cleanUnused: string;
    unusedCount: string;
    deleteCustom: string;
    animationTitle: string;
    frames: string;
    length: string;
    fps: string;
    backfaceCulling: string;
    quickAspect: string;
    play: string;
    pause: string;
    frameScrub: string;
    saveAnimation: string;
    disableAnimation: string;
  };
  codeDrawer: {
    title: string;
    exportTab: string;
    importTab: string;
    template: string;
    format: string;
    copyCode: string;
    codeCopied: string;
    downloadLua: string;
    importCode: string;
    importPlaceholder: string;
    importExecute: string;
    importWarning: string;
    parseErrors: string;
    importedSuccess: string;
  };
  shortcuts: {
    title: string;
    searchPlaceholder: string;
    noResults: string;
  };
  help: {
    title: string;
    tabCoordinates: string;
    tabViewport: string;
    tabTools: string;
    tabTextures: string;
    tabCode: string;
  };
  share: {
    title: string;
    subtitle: string;
    copyLink: string;
    linkCopied: string;
    shareViaDevice: string;
    shareOnX: string;
    shareOnReddit: string;
    shareOnDiscord: string;
    shareOnWhatsApp: string;
    shareOnFacebook: string;
    viewGitHub: string;
  };
}

// Recursive dot-notation key path type generator
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationDictionary>;
