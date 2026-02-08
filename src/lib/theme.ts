import { derived, get, writable } from 'svelte/store';

export type Theme = {
  id: string;
  name: string;
  vars: Record<string, string>; // CSS variables, e.g. {"--bg":"#0f1115"}
};

const STORAGE_CUSTOM = 'focuscript_webide_customThemes_v1';
const STORAGE_ACTIVE = 'focuscript_webide_activeTheme_v1';

export const THEME_FIELDS: Array<{ key: string; labelKey: string; fallback: string }>
  = [
    { key: '--bg', labelKey: 'v_bg', fallback: '#0f1115' },
    { key: '--panel', labelKey: 'v_panel', fallback: '#161a22' },
    { key: '--panel2', labelKey: 'v_panel2', fallback: 'rgba(255,255,255,.02)' },
    { key: '--border', labelKey: 'v_border', fallback: '#2a3040' },
    { key: '--text', labelKey: 'v_text', fallback: '#e6e6e6' },
    { key: '--muted', labelKey: 'v_muted', fallback: '#a0a7b8' },
    { key: '--accent', labelKey: 'v_accent', fallback: '#7aa2f7' },
    { key: '--danger', labelKey: 'v_danger', fallback: '#ff5f5f' },
    { key: '--input', labelKey: 'v_input', fallback: '#0c0f14' },
    { key: '--editorBg', labelKey: 'v_editorBg', fallback: 'transparent' },
    { key: '--selection', labelKey: 'v_sel', fallback: 'rgba(122,162,247,.25)' },

    // Token colors
    { key: '--tok-kw', labelKey: 'v_tok_kw', fallback: '#7aa2f7' },
    { key: '--tok-type', labelKey: 'v_tok_type', fallback: '#9ece6a' },
    { key: '--tok-num', labelKey: 'v_tok_num', fallback: '#e0af68' },
    { key: '--tok-str', labelKey: 'v_tok_str', fallback: '#bb9af7' },
    { key: '--tok-com', labelKey: 'v_tok_com', fallback: '#565f89' },
    { key: '--tok-ann', labelKey: 'v_tok_ann', fallback: '#7dcfff' },
    { key: '--tok-key', labelKey: 'v_tok_key', fallback: '#7dcfff' },
    { key: '--tok-op', labelKey: 'v_tok_op', fallback: '#a0a7b8' }
  ];

export const BUILTIN_THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    vars: {
      '--bg': '#0f1115',
      '--panel': '#161a22',
      '--panel2': 'rgba(255,255,255,.02)',
      '--border': '#2a3040',
      '--text': '#e6e6e6',
      '--muted': '#a0a7b8',
      '--accent': '#7aa2f7',
      '--danger': '#ff5f5f',
      '--input': '#0c0f14',
      '--editorBg': 'transparent',
      '--selection': 'rgba(122,162,247,.25)',
      '--tok-kw': '#7aa2f7',
      '--tok-type': '#9ece6a',
      '--tok-num': '#e0af68',
      '--tok-str': '#bb9af7',
      '--tok-com': '#565f89',
      '--tok-ann': '#7dcfff',
      '--tok-key': '#7dcfff',
      '--tok-op': '#a0a7b8'
    }
  },
  {
    id: 'snow',
    name: 'Snow',
    vars: {
      '--bg': '#f7f8fb',
      '--panel': '#ffffff',
      '--panel2': '#ffffff',
      '--border': 'rgba(20, 25, 36, .12)',
      '--text': '#161a22',
      '--muted': '#55607a',
      '--accent': '#3b82f6',
      '--danger': '#dc2626',
      '--input': '#f1f3f8',
      '--editorBg': 'transparent',
      '--selection': 'rgba(59,130,246,.18)',
      '--tok-kw': '#2563eb',
      '--tok-type': '#16a34a',
      '--tok-num': '#b45309',
      '--tok-str': '#7c3aed',
      '--tok-com': '#94a3b8',
      '--tok-ann': '#0891b2',
      '--tok-key': '#0891b2',
      '--tok-op': '#64748b'
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    vars: {
      '--bg': '#0b1411',
      '--panel': '#101f1a',
      '--panel2': 'rgba(255,255,255,.02)',
      '--border': '#1f3a2f',
      '--text': '#e7f2ee',
      '--muted': '#93b2a7',
      '--accent': '#34d399',
      '--danger': '#fb7185',
      '--input': '#0a100e',
      '--editorBg': 'transparent',
      '--selection': 'rgba(52,211,153,.18)',
      '--tok-kw': '#34d399',
      '--tok-type': '#a7f3d0',
      '--tok-num': '#fbbf24',
      '--tok-str': '#c4b5fd',
      '--tok-com': '#5c7a6f',
      '--tok-ann': '#60a5fa',
      '--tok-key': '#60a5fa',
      '--tok-op': '#93b2a7'
    }
  }
];

function safeParse<T>(json: string | null): T | null {
  try {
    if (!json) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function normalizeTheme(t: any): Theme | null {
  if (!t || typeof t !== 'object') return null;
  const id = String(t.id ?? '').trim();
  const name = String(t.name ?? '').trim();
  const vars = t.vars && typeof t.vars === 'object' ? (t.vars as Record<string, string>) : null;
  if (!id || !name || !vars) return null;

  const outVars: Record<string, string> = {};
  for (const f of THEME_FIELDS) {
    const v = vars[f.key];
    if (typeof v === 'string' && v.trim()) outVars[f.key] = v.trim();
  }
  // Keep any extra vars too (forward compatibility)
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'string' && v.trim() && !(k in outVars)) outVars[k] = v.trim();
  }

  return { id, name, vars: outVars };
}

function safeReadCustomThemes(): Theme[] {
  if (typeof localStorage === 'undefined') return [];
  const arr = safeParse<any[]>(localStorage.getItem(STORAGE_CUSTOM)) ?? [];
  const out: Theme[] = [];
  for (const t of arr) {
    const nt = normalizeTheme(t);
    if (!nt) continue;
    if (BUILTIN_THEMES.some((b) => b.id === nt.id)) continue;
    if (out.some((x) => x.id === nt.id)) continue;
    out.push(nt);
  }
  return out;
}

function safeReadActiveThemeId(): string {
  if (typeof localStorage === 'undefined') return 'midnight';
  const id = String(localStorage.getItem(STORAGE_ACTIVE) ?? '').trim();
  return id || 'midnight';
}

export const customThemes = writable<Theme[]>(safeReadCustomThemes());
export const activeThemeId = writable<string>(safeReadActiveThemeId());

customThemes.subscribe((themes) => {
  try {
    localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(themes));
  } catch {
    // ignore
  }
});

activeThemeId.subscribe((id) => {
  try {
    localStorage.setItem(STORAGE_ACTIVE, id);
  } catch {
    // ignore
  }
});

export const themes = derived(customThemes, ($custom) => [...BUILTIN_THEMES, ...$custom]);

export const activeTheme = derived([themes, activeThemeId], ([$themes, $id]) => {
  return $themes.find((t) => t.id === $id) ?? $themes[0];
});

export function applyTheme(theme: Theme | null | undefined): void {
  if (typeof document === 'undefined') return;
  const t = theme ?? get(activeTheme);
  const root = document.documentElement;

  // Ensure all known fields have a value (fallbacks).
  const merged: Record<string, string> = { ...t.vars };
  for (const f of THEME_FIELDS) {
    if (!merged[f.key]) merged[f.key] = f.fallback;
  }

  for (const [k, v] of Object.entries(merged)) root.style.setProperty(k, v);
}

// Auto-apply whenever it changes.
activeTheme.subscribe((t) => applyTheme(t));

export function createThemeFromBase(base: Theme, next: { id: string; name: string }): Theme {
  return {
    id: next.id.trim(),
    name: next.name.trim(),
    vars: { ...base.vars }
  };
}

export function upsertCustomTheme(theme: Theme): void {
  const t = normalizeTheme(theme);
  if (!t) throw new Error('Invalid theme');
  if (BUILTIN_THEMES.some((b) => b.id === t.id)) throw new Error('Theme id is reserved');
  customThemes.update((list) => {
    const idx = list.findIndex((x) => x.id === t.id);
    if (idx === -1) return [...list, t];
    const next = [...list];
    next[idx] = t;
    return next;
  });
}

export function deleteCustomTheme(id: string): void {
  customThemes.update((list) => list.filter((t) => t.id !== id));
  if (get(activeThemeId) === id) activeThemeId.set('midnight');
}

export function exportTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

export function importTheme(jsonText: string): Theme {
  const parsed = safeParse<any>(jsonText);
  const t = normalizeTheme(parsed);
  if (!t) throw new Error('Invalid theme');
  return t;
}
