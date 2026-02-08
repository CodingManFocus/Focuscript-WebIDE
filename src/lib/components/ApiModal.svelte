<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { uiLang, tr } from '$lib/i18n';
  import type { ApiClass } from '$lib/services/webide';
  import { getApiIndex } from '$lib/services/webide';

  export let open = false;
  export let token = '';

  const dispatch = createEventDispatcher<{ close: void }>();

  let apiSearch = '';
  let apiIndex: ApiClass[] | null = null;
  let apiSelected: ApiClass | null = null;
  let loading = false;
  let lastToken = '';

  let t = (key: any, vars: any = {}) => tr('ko', key, vars);

  $: t = (key: any, vars: any = {}) => tr($uiLang, key, vars);

  $: filtered = (apiIndex ?? []).filter((c) => {
    const q = (apiSearch || '').trim().toLowerCase();
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q);
  });

  $: detailText = (() => {
    if (loading) return t('loadingApiIndex');
    if (!apiSelected) return t('selectClassToView');

    const c = apiSelected;
    const lines: string[] = [];
    lines.push(c.name);
    lines.push('');

    if (c.fields && c.fields.length) {
      lines.push(t('fields'));
      for (const f of c.fields) lines.push('  ' + f);
      lines.push('');
    }

    if (c.methods && c.methods.length) {
      lines.push(t('methods'));
      for (const m of c.methods) lines.push('  ' + m);
    }

    return lines.join('\n');
  })();

  async function ensureLoaded() {
    if (!open) return;
    if (!token) return;
    if (apiIndex && lastToken === token) return;
    loading = true;
    lastToken = token;
    try {
      apiIndex = await getApiIndex(token);
    } finally {
      loading = false;
    }
  }

  $: if (open) {
    apiSelected = null;
    apiSearch = '';
    ensureLoaded();
  }

  function close() {
    dispatch('close');
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
</script>

<div id="modalBackdrop" style:display={open ? 'flex' : 'none'} on:click={onBackdropClick}>
  <div id="modal" role="dialog" aria-modal="true" aria-label={t('apiTitle')}>
    <div id="modalHeader">
      <strong>{t('apiTitle')}</strong>
      <span class="spacer"></span>
      <input id="apiSearch" placeholder={t('apiSearchPlaceholder')} bind:value={apiSearch} />
      <button id="modalClose" on:click={close}>{t('close')}</button>
    </div>

    <div id="modalBody">
      <div id="apiList">
        {#each filtered as c}
          <div
            class={"apiItem" + (apiSelected && apiSelected.name === c.name ? ' active' : '')}
            role="button"
            tabindex="0"
            on:click={() => (apiSelected = c)}
          >
            {c.name} <span class="muted">({c.kind})</span>
          </div>
        {/each}
      </div>

      <div id="apiDetail" class="muted">{detailText}</div>
    </div>
  </div>
</div>
