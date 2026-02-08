<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { uiLang, tr } from '$lib/i18n';
  import {
    BUILTIN_THEMES,
    THEME_FIELDS,
    activeTheme,
    activeThemeId,
    applyTheme,
    customThemes,
    createThemeFromBase,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    themes,
    upsertCustomTheme
  } from '$lib/theme';
  import { downloadText } from '$lib/utils/download';

  export let open = false;
  const dispatch = createEventDispatcher<{ close: void }>();

  type Draft = { id: string; name: string; vars: Record<string, string> };

  let draft: Draft | null = null;
  let editingExisting = false;
  let errorMsg = '';
  let importInput: HTMLInputElement | null = null;

  let t = (key: any, vars: any = {}) => tr('ko', key, vars);

  $: t = (key: any, vars: any = {}) => tr($uiLang, key, vars);

  function close() {
    draft = null;
    editingExisting = false;
    errorMsg = '';
    dispatch('close');
  }

  function startNew(duplicateFromCurrent = true) {
    errorMsg = '';
    const base = duplicateFromCurrent ? $activeTheme : BUILTIN_THEMES[0];
    const id = `custom_${Math.random().toString(36).slice(2, 8)}`;
    const created = createThemeFromBase(base, { id, name: 'My Theme' });
    draft = { id: created.id, name: created.name, vars: { ...created.vars } };
    editingExisting = false;
  }

  function startEdit(id: string) {
    errorMsg = '';
    const found = $customThemes.find((x) => x.id === id);
    if (!found) return;
    draft = { id: found.id, name: found.name, vars: { ...found.vars } };
    editingExisting = true;
  }

  function apply(id: string) {
    activeThemeId.set(id);
    const th = $themes.find((x) => x.id === id);
    if (th) applyTheme(th);
  }

  function remove(id: string) {
    if (!confirm(t('confirmDeleteTheme' as any, { id }))) return;
    deleteCustomTheme(id);
  }

  function saveDraft() {
    if (!draft) return;
    errorMsg = '';
    try {
      upsertCustomTheme({ id: draft.id.trim(), name: draft.name.trim(), vars: { ...draft.vars } });
      activeThemeId.set(draft.id.trim());
      draft = null;
      editingExisting = false;
    } catch (e) {
      errorMsg = (e as any)?.message ?? t('importError');
    }
  }

  function exportOne(id: string) {
    const th = $themes.find((x) => x.id === id);
    if (!th) return;
    downloadText(`${th.id}.theme.json`, exportTheme(th));
  }

  async function onImportFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const th = importTheme(text);
      upsertCustomTheme(th);
      activeThemeId.set(th.id);
      errorMsg = '';
    } catch {
      errorMsg = t('importError');
    } finally {
      input.value = '';
    }
  }

  function normalizeColorForPicker(v: string): string {
    const s = (v || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return (
        '#' +
        s
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
      );
    }
    return '#000000';
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  $: if (!open) {
    draft = null;
    editingExisting = false;
    errorMsg = '';
  }
</script>

<div id="themeBackdrop" class="modalBackdrop" style:display={open ? 'flex' : 'none'} on:click={onBackdropClick}>
  <div id="themeModal" class="modal" role="dialog" aria-modal="true" aria-label={t('themeManagerTitle')}>
    <div class="modalHeader">
      <strong>{t('themeManagerTitle')}</strong>
      <span class="spacer"></span>
      <button class="btn" on:click={() => startNew(true)}>{t('createTheme')}</button>
      <button class="btn" on:click={() => importInput?.click()}>{t('import')}</button>
      <input
        bind:this={importInput}
        type="file"
        accept="application/json,.json"
        style="display:none"
        on:change={onImportFileChange}
      />
      <button class="btn" on:click={close}>{t('close')}</button>
    </div>

    <div class="modalBody themeBody">
      <div class="themeList">
        <div class="groupTitle">{t('builtInThemes')}</div>
        {#each BUILTIN_THEMES as th}
          <div class="themeRow">
            <div class="themeName">
              <span class="dot" style:background={th.vars['--accent']}></span>
              <div>
                <div>{th.name}</div>
                <div class="muted tiny">{th.id}</div>
              </div>
            </div>
            <div class="rowActions">
              <button class="btn" class:primary={$activeThemeId === th.id} on:click={() => apply(th.id)}>
                {t('apply')}
              </button>
              <button class="btn" on:click={() => exportOne(th.id)}>{t('export')}</button>
            </div>
          </div>
        {/each}

        <div class="groupTitle" style="margin-top:14px;">{t('customThemes')}</div>
        {#if $customThemes.length === 0}
          <div class="muted" style="padding:10px 4px;">—</div>
        {/if}
        {#each $customThemes as th}
          <div class="themeRow">
            <div class="themeName">
              <span class="dot" style:background={th.vars['--accent']}></span>
              <div>
                <div>{th.name}</div>
                <div class="muted tiny">{th.id}</div>
              </div>
            </div>
            <div class="rowActions">
              <button class="btn" class:primary={$activeThemeId === th.id} on:click={() => apply(th.id)}>
                {t('apply')}
              </button>
              <button class="btn" on:click={() => startEdit(th.id)}>{t('edit')}</button>
              <button class="btn" on:click={() => exportOne(th.id)}>{t('export')}</button>
              <button class="btn danger" on:click={() => remove(th.id)}>{t('delete')}</button>
            </div>
          </div>
        {/each}
      </div>

      <div class="themeEditor">
        {#if draft}
          <div class="editorHeader">
            <strong>{editingExisting ? t('edit') : t('createTheme')}</strong>
            <span class="spacer"></span>
            <button class="btn" on:click={() => (draft = null)}>{t('cancel')}</button>
            <button class="btn primary" on:click={saveDraft}>{t('saveTheme')}</button>
          </div>

          {#if errorMsg}
            <div class="error">{errorMsg}</div>
          {/if}

          <div class="form">
            <label>
              <div class="label">{t('themeId')}</div>
              <input class="input" bind:value={draft.id} disabled={editingExisting} />
            </label>
            <label>
              <div class="label">{t('themeName')}</div>
              <input class="input" bind:value={draft.name} />
            </label>
          </div>

          <div class="vars">
            {#each THEME_FIELDS as f}
              <div class="varRow">
                <div class="varLabel">{t(f.labelKey as any)}</div>
                <div class="varInputs">
                  <input
                    class="color"
                    type="color"
                    value={normalizeColorForPicker(draft.vars[f.key] ?? f.fallback)}
                    on:input={(e) => {
                      const v = (e.currentTarget as HTMLInputElement).value;
                      draft = { ...draft!, vars: { ...draft!.vars, [f.key]: v } };
                    }}
                  />
                  <input
                    class="input mono"
                    value={draft.vars[f.key] ?? f.fallback}
                    on:input={(e) => {
                      const v = (e.currentTarget as HTMLInputElement).value;
                      draft = { ...draft!, vars: { ...draft!.vars, [f.key]: v } };
                    }}
                  />
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="muted" style="padding:12px; line-height: 1.6;">
            <div><strong>{t('theme')}</strong></div>
            <div style="margin-top:6px;">{t('duplicateFromCurrent')}: {($activeTheme?.name ?? '').toString()}</div>
            <div style="margin-top:10px;">{t('createTheme')} → {t('edit')} → {t('export')} / {t('import')}</div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .modalBackdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 18px;
    z-index: 50;
  }
  .modal {
    width: min(1100px, 100%);
    height: min(760px, 100%);
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .modalHeader {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
    background: color-mix(in srgb, var(--panel) 95%, transparent);
  }
  .modalBody {
    display: flex;
    min-height: 0;
    flex: 1;
  }
  .spacer {
    flex: 1;
  }
  .btn {
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    border-radius: 10px;
    padding: 7px 10px;
    cursor: pointer;
  }
  .btn:hover {
    border-color: color-mix(in srgb, var(--border) 40%, var(--accent));
  }
  .btn.primary {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    background: color-mix(in srgb, var(--accent) 12%, var(--panel));
  }
  .btn.danger {
    border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
    background: color-mix(in srgb, var(--danger) 12%, var(--panel));
  }

  .themeBody {
    min-height: 0;
  }
  .themeList {
    width: 46%;
    border-right: 1px solid var(--border);
    overflow: auto;
    padding: 12px;
    background: color-mix(in srgb, var(--panel2) 90%, transparent);
  }
  .groupTitle {
    font-size: 12px;
    color: var(--muted);
    margin: 6px 0;
  }
  .themeRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px;
    border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, var(--panel) 92%, transparent);
    margin: 8px 0;
  }
  .themeName {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    flex: 0 0 auto;
  }
  .tiny {
    font-size: 11px;
  }
  .rowActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .themeEditor {
    flex: 1;
    overflow: auto;
    padding: 12px;
    min-width: 0;
  }
  .editorHeader {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .error {
    padding: 10px;
    border: 1px solid color-mix(in srgb, var(--danger) 60%, var(--border));
    background: color-mix(in srgb, var(--danger) 12%, var(--panel));
    border-radius: 12px;
    margin-bottom: 12px;
  }
  .form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  label {
    display: block;
  }
  .label {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .input {
    width: 100%;
    border: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
    border-radius: 12px;
    padding: 9px 10px;
    outline: none;
  }
  .input:focus {
    border-color: color-mix(in srgb, var(--accent) 60%, var(--border));
  }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  .vars {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .varRow {
    display: grid;
    grid-template-columns: 170px 1fr;
    gap: 10px;
    align-items: center;
  }
  .varLabel {
    font-size: 12px;
    color: var(--muted);
  }
  .varInputs {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .color {
    width: 42px;
    height: 38px;
    border: 1px solid var(--border);
    background: var(--panel);
    border-radius: 12px;
    padding: 4px;
    cursor: pointer;
  }

  @media (max-width: 920px) {
    .themeList {
      width: 52%;
    }
    .form {
      grid-template-columns: 1fr;
    }
    .varRow {
      grid-template-columns: 1fr;
    }
  }
</style>
