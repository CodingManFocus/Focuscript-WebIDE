<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { baseUrl, defaultBaseUrl, normalizeBaseUrl, setBaseUrl } from '$lib/api';
  import { detectLang, highlight } from '$lib/highlight';
  import { tr, type I18nKey, uiLang } from '$lib/i18n';
  import { activeThemeId, themes } from '$lib/theme';
  import ApiModal from '$lib/components/ApiModal.svelte';
  import ThemeModal from '$lib/components/ThemeModal.svelte';
  import type { JobInfo, StatusInfo, Workspace } from '$lib/services/webide';
  import {
    getFiles,
    getStatus,
    getWorkspaces,
    getJob,
    newFile,
    newWorkspace,
    readFile,
    reloadAll,
    reloadWorkspace,
    writeFile
  } from '$lib/services/webide';

  // Token handling:
  // The token is intentionally part of the URL (printed by /fs webide).
  // Keep the full URL private.
  let token = '';
  let baseUrlDraft = defaultBaseUrl();

  // Status
  let statusInfo: StatusInfo | null = null;
  let statusErr: 'missingToken' | 'failedToConnect' | null = null;
  let jobText = '';

  // Workspace/File state
  let workspaces: Workspace[] = [];
  let ws: string | null = null;
  let prevWs: string | null = null;
  let files: string[] = [];
  let file: string | null = null;
  let dirty = false;
  let fileFilter = '';
  let sidebarOpen = true;

  // Editor state
  let textValue = '';
  let hlHtml = '';
  let highlightPending = false;
  let isComposing = false;

  let textEl: HTMLTextAreaElement | null = null;
  let highlightEl: HTMLElement | null = null;

  // Modals
  let apiModalOpen = false;
  let themeModalOpen = false;

  let t = (key: I18nKey, vars: Record<string, string | number> = {}) => tr('ko', key, vars);

  $: t = (key: I18nKey, vars: Record<string, string | number> = {}) => tr($uiLang, key, vars);

  $: statusText = (() => {
    if (statusErr === 'missingToken') return t('missingToken');
    if (statusErr === 'failedToConnect') return t('failedToConnect');
    if (!statusInfo) return t('connecting');
    return t('statusRunning', {
      version: statusInfo.pluginVersion,
      loaded: statusInfo.loadedModules,
      bind: statusInfo.bind,
      port: statusInfo.port
    });
  })();

  $: filteredFiles = (() => {
    const q = (fileFilter || '').trim().toLowerCase();
    if (!q) return files;
    return files.filter((p) => p.toLowerCase().includes(q));
  })();

  function setJob(text: string) {
    jobText = text || '';
  }

  function setDirty(isDirty: boolean) {
    dirty = !!isDirty;
  }

  function syncScroll() {
    if (!textEl || !highlightEl) return;
    highlightEl.scrollTop = textEl.scrollTop;
    highlightEl.scrollLeft = textEl.scrollLeft;
  }

  function updateHighlightNow() {
    const lang = detectLang(file || '');
    hlHtml = highlight(textValue || '', lang);
    syncScroll();
  }

  function scheduleHighlight() {
    if (highlightPending) return;
    highlightPending = true;
    requestAnimationFrame(() => {
      highlightPending = false;
      updateHighlightNow();
    });
  }

  function applyTextEdit(nextText: string, selectionStart: number, selectionEnd: number) {
    textValue = nextText;
    setDirty(true);
    scheduleHighlight();
    requestAnimationFrame(() => {
      if (!textEl) return;
      textEl.selectionStart = selectionStart;
      textEl.selectionEnd = selectionEnd;
      textEl.focus();
      syncScroll();
    });
  }

  function getLineStart(text: string, index: number) {
    return text.lastIndexOf('\n', index - 1) + 1;
  }

  function handleTabKey(shiftKey: boolean) {
    if (!textEl) return;
    const text = textValue;
    const start = textEl.selectionStart;
    const end = textEl.selectionEnd;
    const selection = text.slice(start, end);

    if (selection.includes('\n')) {
      const blockStart = getLineStart(text, start);
      const blockEndRaw = text.indexOf('\n', end);
      const blockEnd = blockEndRaw === -1 ? text.length : blockEndRaw;
      const block = text.slice(blockStart, blockEnd);
      const lines = block.split('\n');

      if (!shiftKey) {
        const newBlock = lines.map((line) => `\t${line}`).join('\n');
        const nextText = text.slice(0, blockStart) + newBlock + text.slice(blockEnd);
        applyTextEdit(nextText, start + 1, end + lines.length);
        return;
      }

      let removedTotal = 0;
      let removedFirst = 0;
      const newLines = lines.map((line, i) => {
        if (line.startsWith('\t')) {
          removedTotal += 1;
          if (i === 0) removedFirst = 1;
          return line.slice(1);
        }
        if (line.startsWith('  ')) {
          removedTotal += 2;
          if (i === 0) removedFirst = 2;
          return line.slice(2);
        }
        return line;
      });
      const nextText = text.slice(0, blockStart) + newLines.join('\n') + text.slice(blockEnd);
      const newStart = start - (start > blockStart ? removedFirst : 0);
      const newEnd = end - removedTotal;
      applyTextEdit(nextText, newStart, newEnd);
      return;
    }

    if (shiftKey) {
      const lineStart = getLineStart(text, start);
      let removed = 0;
      if (text.startsWith('\t', lineStart)) removed = 1;
      else if (text.startsWith('  ', lineStart)) removed = 2;
      if (removed > 0) {
        const nextText = text.slice(0, lineStart) + text.slice(lineStart + removed);
        const newStart = Math.max(start - removed, lineStart);
        const newEnd = Math.max(end - removed, lineStart);
        applyTextEdit(nextText, newStart, newEnd);
      }
      return;
    }

    const nextText = text.slice(0, start) + '\t' + text.slice(end);
    const nextPos = start + 1;
    applyTextEdit(nextText, nextPos, nextPos);
  }

  function handleEnterKey() {
    if (!textEl) return;
    const text = textValue;
    const start = textEl.selectionStart;
    const end = textEl.selectionEnd;
    const lineStart = getLineStart(text, start);
    const lineBefore = text.slice(lineStart, start);
    const indentMatch = lineBefore.match(/^[\t ]*/);
    const baseIndent = indentMatch ? indentMatch[0] : '';
    const trimmed = lineBefore.trimEnd();
    const needsIndent = trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[');
    const insert = `\n${baseIndent}${needsIndent ? '\t' : ''}`;
    const nextText = text.slice(0, start) + insert + text.slice(end);
    const nextPos = start + insert.length;
    applyTextEdit(nextText, nextPos, nextPos);
  }

  function onEditorKeydown(e: KeyboardEvent) {
    if (isComposing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabKey(e.shiftKey);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnterKey();
    }
  }

  function sortFiles(list: string[]): string[] {
    const pinned = new Set(['script.yml']);
    return [...list].sort((a, b) => {
      const ap = pinned.has(a) ? -1 : 0;
      const bp = pinned.has(b) ? -1 : 0;
      if (ap !== bp) return ap - bp;
      const as = a.startsWith('src/') ? -1 : 0;
      const bs = b.startsWith('src/') ? -1 : 0;
      if (as !== bs) return as - bs;
      return a.localeCompare(b);
    });
  }

  async function refreshStatus() {
    if (!token) {
      statusErr = 'missingToken';
      statusInfo = null;
      return;
    }
    statusInfo = await getStatus(token);
    statusErr = null;
  }

  async function loadWorkspaces() {
    const list = await getWorkspaces(token);
    workspaces = list;

    // Keep current selection if possible.
    const ids = new Set(list.map((w) => w.id));
    if (!ws || !ids.has(ws)) {
      ws = list[0]?.id ?? null;
    }
    prevWs = ws;
  }

  async function loadFiles() {
    if (!ws) return;
    const list = await getFiles(token, ws);
    files = sortFiles(list);
  }

  async function openFile(path: string) {
    if (!ws) return;
    if (dirty && !confirm(t('confirmDiscardOpen'))) return;

    file = path;
    setDirty(false);

    const text = await readFile(token, ws, path);
    textValue = text;
    updateHighlightNow();

    // keep list up-to-date (e.g. new file was created by compilation)
    await loadFiles();
  }

  async function saveFile() {
    if (!ws || !file) return;
    await writeFile(token, ws, file, textValue);
    setDirty(false);
    setJob(t('saved'));
    setTimeout(() => setJob(''), 1200);
  }

  async function createNewFile() {
    if (!ws) return;
    const rel = prompt(t('promptNewFilePath'));
    if (!rel) return;

    await newFile(token, ws, rel);
    await loadFiles();
    await openFile(rel);
  }

  async function createNewWorkspace() {
    const id = (prompt(t('promptNewModuleId'), 'my_module') || '').trim();
    if (!id) return;
    const name = (prompt(t('promptModuleDisplayName'), id) || id).trim();
    const version = (prompt(t('promptModuleVersion'), '1.0.0') || '1.0.0').trim();
    const enable = confirm(t('confirmLoadEnable'));
    const load = enable ? 'enable' : 'disable';

    const res = await newWorkspace(token, { id, name, version, load });
    setJob(t('createdModule', { id: res.id }));

    await refreshStatus();
    await loadWorkspaces();

    ws = id;
    prevWs = id;
    file = null;
    textValue = '';
    updateHighlightNow();
    setDirty(false);

    await loadFiles();
    await openFile('script.yml');
  }

  async function pollJob(jobId: string | number) {
    setJob(`Job ${jobId}: running...`);

    let last: JobInfo | null = null;
    while (true) {
      const j = await getJob(token, jobId);
      last = j;
      setJob(`Job ${jobId}: ${j.status} • ${j.message}`);

      if (j.status === 'success' || j.status === 'error') break;
      await new Promise((r) => setTimeout(r, 900));
    }

    if (last?.status === 'error') {
      alert(last.message || 'Job failed');
    }

    await refreshStatus();
    await loadWorkspaces();
    await loadFiles();
  }

  async function reloadModule() {
    if (!ws) return;
    if (dirty) {
      alert(t('alertSaveBeforeReload'));
      return;
    }
    const res = await reloadWorkspace(token, ws);
    await pollJob(res.jobId);
  }

  async function reloadEverything() {
    if (!confirm(t('confirmReloadAll'))) return;
    const res = await reloadAll(token);
    await pollJob(res.jobId);
  }

  async function onWorkspaceChange() {
    if (!ws) return;

    if (dirty && !confirm(t('confirmDiscardSwitchWs'))) {
      ws = prevWs;
      return;
    }

    prevWs = ws;
    file = null;
    textValue = '';
    updateHighlightNow();
    setDirty(false);
    await loadFiles();
  }

  async function reconnectAndNotify(message: string) {
    try {
      await refreshStatus();
      await loadWorkspaces();
      await loadFiles();
    } catch (e) {
      console.error(e);
      statusErr = token ? 'failedToConnect' : 'missingToken';
    }

    setJob(message);
    setTimeout(() => setJob(''), 2200);
  }

  async function applyBaseUrlDraft() {
    const next = normalizeBaseUrl(baseUrlDraft);
    setBaseUrl(next);
    baseUrlDraft = next;
    await reconnectAndNotify(t('baseUrlUpdated', { url: next }));
  }

  function onGlobalKeydown(e: KeyboardEvent) {
    const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
    if (isSave) {
      e.preventDefault();
      saveFile();
    }
  }

  onMount(async () => {
    const url = new URL(window.location.href);
    token = url.searchParams.get('token') || '';
    const baseFromUrl = (url.searchParams.get('base') || '').trim();
    if (baseFromUrl) setBaseUrl(baseFromUrl);
    baseUrlDraft = $baseUrl;

    window.addEventListener('keydown', onGlobalKeydown);

    try {
      await refreshStatus();
      await loadWorkspaces();
      await loadFiles();
      setJob('');
    } catch (e) {
      console.error(e);
      statusErr = token ? 'failedToConnect' : 'missingToken';
    }

    // Initial render for empty editor
    updateHighlightNow();
  });

  onDestroy(() => {
    window.removeEventListener('keydown', onGlobalKeydown);
  });
</script>

<header>
  <button class="iconBtn" on:click={() => (sidebarOpen = !sidebarOpen)} title={t('sidebarToggle')}>☰</button>
  <strong>{t('appTitle')}</strong>
  <span id="status">{statusText}</span>

  <span class="spacer"></span>

  <label class="muted" for="workspaceSelect">{t('workspace')}</label>
  <select id="workspaceSelect" bind:value={ws} on:change={onWorkspaceChange}>
    {#each workspaces as w}
      <option value={w.id}>{w.id}{w.loaded ? ' (loaded)' : ''}</option>
    {/each}
  </select>

  <button id="newWorkspaceBtn" on:click={createNewWorkspace}>{t('newModule')}</button>
  <button
    id="refreshBtn"
    on:click={async () => {
      await refreshStatus();
      await loadWorkspaces();
      await loadFiles();
    }}
  >
    {t('refresh')}
  </button>

  <button id="apiBtn" on:click={() => (apiModalOpen = true)}>{t('api')}</button>

  <button id="reloadBtn" class="primary" on:click={reloadModule}>{t('reloadModule')}</button>
  <button id="reloadAllBtn" class="danger" on:click={reloadEverything}>{t('reloadAll')}</button>

  <select aria-label={t('theme')} bind:value={$activeThemeId}>
    {#each $themes as th}
      <option value={th.id}>{th.name}</option>
    {/each}
  </select>
  <button on:click={() => (themeModalOpen = true)}>{t('manageThemes')}</button>

  <select aria-label={t('language')} bind:value={$uiLang}>
    <option value="ko">한국어</option>
    <option value="en">English</option>
  </select>

  <button id="saveBtn" class="primary" on:click={saveFile}>{t('save')}</button>
</header>

<main>
  <aside id="sidebar" class:closed={!sidebarOpen}>
    <div id="baseUrlPanel">
      <label class="muted" for="baseUrlInput">{t('baseUrl')}</label>
      <div class="baseUrlRow">
        <input
          id="baseUrlInput"
          class="baseUrlInput"
          placeholder={t('baseUrlPlaceholder')}
          bind:value={baseUrlDraft}
          on:keydown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            applyBaseUrlDraft();
          }}
        />
        <button id="setBaseUrlBtn" on:click={applyBaseUrlDraft}>{t('setBaseUrl')}</button>
      </div>
    </div>

    <div id="sidebarTop">
      <div><strong>{t('files')}</strong></div>
      <button id="newFileBtn" on:click={createNewFile}>{t('newFile')}</button>
    </div>

    <div class="sidebarSearch">
      <input placeholder={t('fileSearchPlaceholder')} bind:value={fileFilter} />
    </div>

    <div id="fileList">
      {#each filteredFiles as p}
        <div
          class={"file" + (p === file ? ' active' : '')}
          role="button"
          tabindex="0"
          on:click={() => openFile(p)}
        >
          <span aria-hidden="true">📄</span>
          <span>{p}</span>
        </div>
      {/each}
    </div>

    <div id="tips">
      <div><strong>{t('notes')}</strong></div>
      <ul>
        <li>{t('note1')}</li>
        <li>{t('note2')}</li>
        <li>{@html t('note3').replaceAll('Save', '<b>Save</b>').replaceAll('저장', '<b>저장</b>')}</li>
        <li>{t('note4')}</li>
      </ul>
    </div>
  </aside>

  <section id="editor">
    <div id="editorTop">
      <span id="currentFile">{file ? `${ws} / ${file}` : t('noFileSelected')}</span>
      <span id="dirty" style:display={dirty ? 'inline' : 'none'}>{t('unsavedDot')}</span>
      <span id="job">{jobText}</span>
    </div>

    <div id="editorWrap">
      <pre id="highlight" bind:this={highlightEl}><code id="hlCode">{@html hlHtml}</code></pre>
      <textarea
        id="text"
        bind:this={textEl}
        bind:value={textValue}
        spellcheck="false"
        on:keydown={onEditorKeydown}
        on:compositionstart={() => {
          isComposing = true;
        }}
        on:compositionupdate={() => {
          // Keep syntax highlight visible while using IME (Korean/Japanese/Chinese).
          // Some browsers don't fire input events for each composition update,
          // so we sync from the textarea value here.
          if (textEl) {
            textValue = textEl.value;
            setDirty(true);
          }
          scheduleHighlight();
        }}
        on:compositionend={() => {
          isComposing = false;
          if (textEl) {
            textValue = textEl.value;
            setDirty(true);
          }
          scheduleHighlight();
        }}
        on:input={() => {
          setDirty(true);
          scheduleHighlight();
        }}
        on:scroll={syncScroll}
      ></textarea>
    </div>
  </section>
</main>

<ApiModal open={apiModalOpen} {token} on:close={() => (apiModalOpen = false)} />
<ThemeModal open={themeModalOpen} on:close={() => (themeModalOpen = false)} />

<style>
  .iconBtn {
    padding: 7px 10px;
    min-width: 38px;
  }

  #baseUrlPanel {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--panel2) 92%, transparent);
  }

  .baseUrlRow {
    margin-top: 6px;
    display: flex;
    gap: 8px;
  }

  .baseUrlInput {
    min-width: 0;
    flex: 1;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  #sidebar.closed {
    display: none;
  }

  @media (max-width: 860px) {
    #sidebar {
      width: 260px;
    }
    header {
      flex-wrap: wrap;
    }
    #status {
      width: 100%;
      order: 99;
      margin-top: 6px;
    }
  }
  @media (max-width: 680px) {
    #sidebar {
      display: none;
    }
  }
</style>
