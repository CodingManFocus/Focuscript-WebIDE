import { writable } from 'svelte/store';

export type UiLang = 'ko' | 'en';

const STORAGE_KEY = 'focuscript_webide_lang_v1';

function safeReadLang(): UiLang {
  if (typeof localStorage === 'undefined') return 'ko';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'en' || v === 'ko' ? v : 'ko';
}

export const uiLang = writable<UiLang>(safeReadLang());

uiLang.subscribe((v) => {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // ignore
  }
});

export const I18N = {
  en: {
    appTitle: 'Focuscript Web IDE',
    connecting: 'Connecting…',
    missingToken: 'Missing token. Open this page using the URL printed by /fs webide.',
    failedToConnect: 'Failed to connect. Check token and server logs.',
    statusRunning: 'Running (v{version}) • loadedModules={loaded} • {bind}:{port}',

    workspace: 'Workspace',
    newModule: 'New Module',
    refresh: 'Refresh',
    api: 'API',
    reloadModule: 'Reload Module',
    reloadAll: 'Reload All',
    save: 'Save',
    saved: 'Saved.',

    files: 'Files',
    newFile: 'New',
    fileSearchPlaceholder: 'Filter…',
    noFileSelected: 'No file selected',
    unsavedDot: '● unsaved',

    notes: 'Notes',
    note1: 'The server prints a URL with a token. Keep it private.',
    note2: 'The token is part of the link. Treat the full URL as a secret.',
    note3: 'Typical flow: edit → Save → Reload Module.',
    note4: 'Compilation happens asynchronously inside Focuscript.',

    language: 'Language',
    baseUrl: 'Base URL',
    baseUrlPlaceholder: 'https://host.example.com',
    setBaseUrl: 'Set Base',
    resetBaseUrl: 'Default',
    baseUrlUpdated: 'Base URL updated: {url}',
    baseUrlReset: 'Base URL reset to default: {url}',
    theme: 'Theme',
    manageThemes: 'Manage…',
    sidebarToggle: 'Sidebar',

    confirmDiscardOpen: 'You have unsaved changes. Discard and open another file?',
    confirmDiscardSwitchWs: 'You have unsaved changes. Discard and switch workspace?',
    confirmReloadAll: 'Reload ALL modules? This disables all modules, then queues recompilation.',
    confirmDeleteTheme: 'Delete theme "{id}"?',
    alertSaveBeforeReload: 'Please save before reloading.',

    promptNewFilePath: 'New file path (relative to workspace root).\nExample: src/new.fs',
    promptNewModuleId: 'New module id (letters/numbers/._-)\nExample: my_module',
    promptModuleDisplayName: 'Module display name',
    promptModuleVersion: 'Module version',
    confirmLoadEnable:
      "Set load: enable ?\n\n(If NO: it will be created with load: disable, and won't auto-load on restart until you change it.)",
    createdModule: 'Created module: {id}',

    apiTitle: 'Focuscript API (from _runtime/focuscript-api.jar)',
    apiSearchPlaceholder: 'Search class…',
    close: 'Close',
    loadingApiIndex: 'Loading API index…',
    selectClassToView: 'Select a class to view members.',
    fields: 'FIELDS',
    methods: 'METHODS',

    themeManagerTitle: 'Theme Manager',
    builtInThemes: 'Built-in',
    customThemes: 'Custom',
    createTheme: 'New theme',
    edit: 'Edit',
    delete: 'Delete',
    export: 'Export',
    import: 'Import',
    themeName: 'Theme name',
    themeId: 'Theme id',
    duplicateFromCurrent: 'Duplicate from current',
    cancel: 'Cancel',
    saveTheme: 'Save theme',
    apply: 'Apply',
    importError: 'Invalid theme file.',

    // Theme variables
    v_bg: 'Background',
    v_panel: 'Top bar / Panels',
    v_panel2: 'Sidebar / Surface',
    v_border: 'Border',
    v_text: 'Text',
    v_muted: 'Muted',
    v_accent: 'Accent',
    v_danger: 'Danger',
    v_input: 'Input background',
    v_editorBg: 'Editor background',
    v_sel: 'Selection',
    v_tok_kw: 'Keyword',
    v_tok_type: 'Type',
    v_tok_num: 'Number',
    v_tok_str: 'String',
    v_tok_com: 'Comment',
    v_tok_ann: 'Annotation',
    v_tok_key: 'YAML key',
    v_tok_op: 'Punctuation'
  },
  ko: {
    appTitle: '포커스크립트 Web IDE',
    connecting: '연결 중…',
    missingToken: '토큰이 없습니다. /fs webide 가 출력한 URL로 접속해 주세요.',
    failedToConnect: '연결에 실패했습니다. 토큰과 서버 로그를 확인해 주세요.',
    statusRunning: '실행 중 (v{version}) • loadedModules={loaded} • {bind}:{port}',

    workspace: '워크스페이스',
    newModule: '새 모듈',
    refresh: '새로고침',
    api: 'API',
    reloadModule: '모듈 리로드',
    reloadAll: '전체 리로드',
    save: '저장',
    saved: '저장 완료!',

    files: '파일',
    newFile: '새 파일',
    fileSearchPlaceholder: '필터…',
    noFileSelected: '선택된 파일 없음',
    unsavedDot: '● 미저장',

    notes: '메모',
    note1: '서버가 토큰이 포함된 URL을 출력합니다. 외부에 공유하지 마세요.',
    note2: '토큰은 링크에 포함되어 있습니다. URL 전체를 비밀로 취급하세요.',
    note3: '일반 흐름: 편집 → 저장 → 모듈 리로드.',
    note4: '컴파일은 Focuscript 내부에서 비동기로 진행됩니다.',

    language: '언어',
    baseUrl: 'Base URL',
    baseUrlPlaceholder: 'https://host.example.com',
    setBaseUrl: '적용',
    resetBaseUrl: '기본값',
    baseUrlUpdated: 'Base URL 변경됨: {url}',
    baseUrlReset: 'Base URL 기본값으로 복원: {url}',
    theme: '테마',
    manageThemes: '관리…',
    sidebarToggle: '사이드바',

    confirmDiscardOpen: '저장하지 않은 변경사항이 있습니다. 버리고 다른 파일을 열까요?',
    confirmDiscardSwitchWs: '저장하지 않은 변경사항이 있습니다. 버리고 워크스페이스를 바꿀까요?',
    confirmReloadAll: '모든 모듈을 리로드할까요? (전체 비활성화 후 컴파일이 큐에 들어갑니다)',
    confirmDeleteTheme: '테마 "{id}" 를 삭제할까요?',
    alertSaveBeforeReload: '리로드 전에 먼저 저장해 주세요.',

    promptNewFilePath: '새 파일 경로 (워크스페이스 기준)\n예: src/new.fs',
    promptNewModuleId: '새 모듈 id (영문/숫자/._-)\n예: my_module',
    promptModuleDisplayName: '모듈 표시 이름',
    promptModuleVersion: '모듈 버전',
    confirmLoadEnable:
      'load: enable 로 설정할까요?\n\n(아니오: load: disable 로 생성되고, 나중에 직접 바꾸기 전까지 재시작 시 자동 로드되지 않습니다.)',
    createdModule: '모듈 생성됨: {id}',

    apiTitle: 'Focuscript API (_runtime/focuscript-api.jar)',
    apiSearchPlaceholder: '클래스 검색…',
    close: '닫기',
    loadingApiIndex: 'API 인덱스 불러오는 중…',
    selectClassToView: '클래스를 선택하면 멤버가 표시됩니다.',
    fields: '필드',
    methods: '메서드',

    themeManagerTitle: '테마 관리자',
    builtInThemes: '기본',
    customThemes: '사용자',
    createTheme: '새 테마',
    edit: '수정',
    delete: '삭제',
    export: '내보내기',
    import: '불러오기',
    themeName: '테마 이름',
    themeId: '테마 ID',
    duplicateFromCurrent: '현재 테마 복제',
    cancel: '취소',
    saveTheme: '저장',
    apply: '적용',
    importError: '테마 파일 형식이 올바르지 않습니다.',

    // Theme variables
    v_bg: '배경',
    v_panel: '상단바/패널',
    v_panel2: '사이드바/표면',
    v_border: '테두리',
    v_text: '글자',
    v_muted: '흐린 글자',
    v_accent: '강조색',
    v_danger: '경고색',
    v_input: '입력 배경',
    v_editorBg: '에디터 배경',
    v_sel: '선택 영역',
    v_tok_kw: '키워드',
    v_tok_type: '타입',
    v_tok_num: '숫자',
    v_tok_str: '문자열',
    v_tok_com: '주석',
    v_tok_ann: '어노테이션',
    v_tok_key: 'YAML 키',
    v_tok_op: '기호'
  }
} as const;

export type I18nKey = keyof typeof I18N.en;

export function tr(lang: UiLang, key: I18nKey, vars: Record<string, string | number> = {}): string {
  const table = I18N[lang] ?? I18N.ko;
  let s = (table as any)[key] ?? (I18N.en as any)[key] ?? String(key);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
