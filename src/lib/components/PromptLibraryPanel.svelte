<script lang="ts">
  import { onMount } from 'svelte';
  import { ChevronDown, Copy, Download, LoaderCircle, RefreshCw, Trash2 } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { api } from '$lib/api';
  import type { PromptGenerationSet, SavedPrompt } from '$lib/types';

  const PAGE_SIZE = 50;
  const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
  let groups: PromptGenerationSet[] = [];
  let loading = true;
  let error = '';
  let deletingId = '';
  let copiedId = '';
  let filterQuery = '';
  let filterType = 'all';
  let filterStyle = 'all';
  let expandedGroups = new Set<string>();
  let loadedGroups = new Set<string>();
  let selectedPromptIds = new Set<string>();
  let loadingGroupId = '';
  let loadingMoreGroupId = '';
  let selectingGroupId = '';

  $: styleOptions = Array.from(new Set(groups.map((group) => group.style).filter(Boolean))).sort();
  $: filteredGroups = groups.filter((group) => {
    const query = filterQuery.trim().toLowerCase();
    const matchesMetadata = !query || [group.title, group.seed, group.style].some((value) => value.toLowerCase().includes(query));
    const matchesType = filterType === 'all' || group.assetType === filterType;
    const matchesStyle = filterStyle === 'all' || group.style === filterStyle;
    return matchesMetadata && matchesType && matchesStyle;
  });

  function visiblePrompts(group: PromptGenerationSet) {
    const query = filterQuery.trim().toLowerCase();
    return group.prompts.filter((item) => {
      const matchesQuery = !query || [item.prompt, item.seed].some((value) => value.toLowerCase().includes(query));
      const matchesType = filterType === 'all' || item.assetType === filterType;
      const matchesStyle = filterStyle === 'all' || group.style === filterStyle;
      return matchesQuery && matchesType && matchesStyle;
    });
  }

  function isNew(value: string) {
    const createdAt = new Date(value).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt <= NEW_WINDOW_MS;
  }

  function togglePrompt(id: string) {
    const next = new Set(selectedPromptIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedPromptIds = next;
  }

  function isGroupSelected(group: PromptGenerationSet) {
    const prompts = visiblePrompts(group);
    return prompts.length > 0 && prompts.every((item) => selectedPromptIds.has(item.id));
  }

  async function load() {
    loading = true;
    error = '';
    try {
      groups = await api.listPromptLibrary(100);
      expandedGroups = new Set();
      loadedGroups = new Set();
      selectedPromptIds = new Set();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt Library tidak dapat dimuat';
    } finally {
      loading = false;
    }
  }

  async function loadPrompts(group: PromptGenerationSet, offset = 0): Promise<boolean> {
    if (offset === 0) loadingGroupId = group.id;
    else loadingMoreGroupId = group.id;
    error = '';
    try {
      const page = await api.getPromptLibrarySet(group.id, PAGE_SIZE, offset);
      groups = groups.map((item) => item.id === group.id
        ? { ...item, ...page, prompts: offset ? [...item.prompts, ...page.prompts] : page.prompts }
        : item);
      if (offset === 0) loadedGroups = new Set([...loadedGroups, group.id]);
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt set tidak dapat dimuat';
      return false;
    } finally {
      loadingGroupId = '';
      loadingMoreGroupId = '';
    }
  }

  async function toggleGroup(group: PromptGenerationSet) {
    const next = new Set(expandedGroups);
    if (next.has(group.id)) {
      next.delete(group.id);
      expandedGroups = next;
      return;
    }
    next.add(group.id);
    expandedGroups = next;
    if (!loadedGroups.has(group.id)) await loadPrompts(group);
  }

  async function toggleGroupSelection(group: PromptGenerationSet) {
    const visible = visiblePrompts(group);
    if (isGroupSelected(group)) {
      const next = new Set(selectedPromptIds);
      visible.forEach((item) => next.delete(item.id));
      selectedPromptIds = next;
      return;
    }

    selectingGroupId = group.id;
    try {
      let current = groups.find((item) => item.id === group.id);
      while (current && current.prompts.length < current.promptCount) {
        const loaded = await loadPrompts(current, current.prompts.length);
        if (!loaded) break;
        current = groups.find((item) => item.id === group.id);
      }
      const next = new Set(selectedPromptIds);
      if (current) visiblePrompts(current).forEach((item) => next.add(item.id));
      selectedPromptIds = next;
    } finally {
      selectingGroupId = '';
    }
  }

  async function copy(item: SavedPrompt) {
    try {
      await navigator.clipboard.writeText(item.prompt);
      copiedId = item.id;
      setTimeout(() => copiedId = '', 1500);
    } catch {
      error = 'Prompt tidak dapat disalin';
    }
  }

  async function deletePrompt(item: SavedPrompt) {
    if (!window.confirm('Hapus prompt ini?')) return;
    try {
      await api.deleteSavedPrompt(item.id);
      groups = groups.map((group) => group.prompts.some((prompt) => prompt.id === item.id)
        ? { ...group, prompts: group.prompts.filter((prompt) => prompt.id !== item.id), promptCount: Math.max(0, group.promptCount - 1) }
        : group).filter((group) => group.promptCount > 0);
      selectedPromptIds.delete(item.id);
      selectedPromptIds = new Set(selectedPromptIds);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt tidak dapat dihapus';
    }
  }

  async function deleteSet(group: PromptGenerationSet) {
    if (!window.confirm(`Hapus seluruh generation set “${group.title}”?`)) return;
    deletingId = group.id;
    try {
      await api.deletePromptGenerationSet(group.id);
      groups = groups.filter((item) => item.id !== group.id);
      expandedGroups.delete(group.id);
      loadedGroups.delete(group.id);
      group.prompts.forEach((item) => selectedPromptIds.delete(item.id));
      expandedGroups = new Set(expandedGroups);
      loadedGroups = new Set(loadedGroups);
      selectedPromptIds = new Set(selectedPromptIds);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Generation set tidak dapat dihapus';
    } finally {
      deletingId = '';
    }
  }

  async function exportSelected(format: 'csv' | 'txt') {
    const promptIds = [...selectedPromptIds];
    if (!promptIds.length) return;
    try {
      await api.downloadPromptExport(format, undefined, promptIds);
      const selected = new Set(promptIds);
      groups = groups.map((group) => ({
        ...group,
        prompts: group.prompts.map((item) => selected.has(item.id) ? { ...item, status: 'downloaded' } : item)
      }));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Export prompt gagal';
    }
  }

  onMount(load);
</script>

<Card>
  <div class="border-b border-border px-5 py-4">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><p class="eyebrow">Prompt Library</p><h2 class="mt-1 text-base font-bold">Saved generation sets</h2><p class="mt-1 text-xs text-muted-foreground">Set dikelompokkan berdasarkan tanggal. Buka set untuk memuat prompt secara bertahap.</p></div>
      <div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" on:click={() => exportSelected('csv')} disabled={!selectedPromptIds.size}><Download size={13} /> Export selected ({selectedPromptIds.size})</Button><Button size="sm" variant="outline" on:click={() => exportSelected('txt')} disabled={!selectedPromptIds.size}>TXT</Button><Button size="sm" variant="ghost" on:click={load} disabled={loading}><RefreshCw size={13} class={loading ? 'animate-spin' : ''} /> Refresh</Button></div>
    </div>
    <div class="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_220px]"><input aria-label="Filter prompt set" bind:value={filterQuery} placeholder="Filter seed atau set" class="h-9 rounded-md border border-border bg-card px-3 text-xs text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" /><select aria-label="Filter output type" bind:value={filterType} class="h-9 rounded-md border border-border bg-card px-3 text-xs text-card-foreground focus:border-primary"><option value="all">All types</option><option value="images">Images</option><option value="videos">Videos</option></select><select aria-label="Filter style" bind:value={filterStyle} class="h-9 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-card-foreground focus:border-primary"><option value="all">All styles</option>{#each styleOptions as option}<option value={option}>{option}</option>{/each}</select></div>
  </div>
  {#if error}<p class="m-5 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error" role="alert">{error}</p>{/if}
  {#if loading}<div class="p-8 text-center text-sm text-muted-foreground">Loading Prompt Library...</div>{:else if !groups.length}<div class="p-8 text-center text-sm text-muted-foreground">Belum ada prompt yang tersimpan.</div>{:else}
    <div class="space-y-8 p-5">
      {#each Object.entries(filteredGroups.reduce<Record<string, PromptGenerationSet[]>>((result, group) => { const key = new Date(group.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }); (result[key] ??= []).push(group); return result; }, {})) as [date, sets]}
        <section><h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{date}</h3><div class="space-y-3">
          {#each sets as group}
            <div class="overflow-hidden rounded-md border border-border">
              <div class="flex flex-col justify-between gap-3 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center">
                <button type="button" class="min-w-0 text-left" aria-expanded={expandedGroups.has(group.id)} on:click={() => toggleGroup(group)}><div class="flex flex-wrap items-center gap-2"><ChevronDown size={15} class={`shrink-0 transition-transform ${expandedGroups.has(group.id) ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} /><h4 class="truncate text-sm font-bold">{group.title}</h4><Badge tone={isNew(group.createdAt) ? 'success' : 'muted'}>{isNew(group.createdAt) ? 'New' : 'Older'}</Badge></div><p class="mt-1 pl-6 text-[11px] text-muted-foreground">{group.seed} · {group.assetType} · {group.locale} · {group.prompts.length}/{group.promptCount} prompts loaded</p></button>
                <div class="flex flex-wrap items-center gap-1"><Button size="sm" variant="ghost" on:click={() => toggleGroup(group)} disabled={loadingGroupId === group.id}>{#if loadingGroupId === group.id}<LoaderCircle size={13} class="animate-spin" /> Loading{:else}{expandedGroups.has(group.id) ? 'Hide' : 'Show'} prompts{/if}</Button><Button size="icon" variant="ghost" ariaLabel={`Delete generation set ${group.title}`} on:click={() => deleteSet(group)} disabled={deletingId === group.id}>{#if deletingId === group.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button></div>
              </div>
              {#if expandedGroups.has(group.id)}
                {#if loadingGroupId === group.id && !loadedGroups.has(group.id)}<div class="p-6 text-center text-xs text-muted-foreground">Loading prompts on demand...</div>{:else if !visiblePrompts(group).length}<div class="p-6 text-center text-xs text-muted-foreground">Tidak ada prompt yang cocok.</div>{:else}<div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs"><thead class="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th class="w-10 px-4 py-2"><span class="sr-only">Select</span></th><th class="px-4 py-2"><label class="flex cursor-pointer items-center gap-2 normal-case tracking-normal"><input type="checkbox" aria-label={`Select all prompts in ${group.title}`} checked={isGroupSelected(group)} disabled={selectingGroupId === group.id || loadingMoreGroupId === group.id} on:change={() => toggleGroupSelection(group)} /><span>Prompt</span>{#if selectingGroupId === group.id}<LoaderCircle size={12} class="animate-spin" />{/if}</label></th><th class="px-4 py-2">Type</th><th class="px-4 py-2">Status</th><th class="px-4 py-2">Confidence</th><th class="px-4 py-2">Created</th><th class="px-4 py-2">Action</th></tr></thead><tbody class="divide-y divide-border/60">{#each visiblePrompts(group) as item}<tr class="align-top hover:bg-muted/30"><td class="px-4 py-3"><input type="checkbox" aria-label="Select prompt for export" checked={selectedPromptIds.has(item.id)} on:change={() => togglePrompt(item.id)} /></td><td class="max-w-[500px] px-4 py-3 leading-5 text-muted-foreground"><div class="mb-2 flex flex-wrap items-center gap-1"><Badge tone={isNew(item.createdAt) ? 'success' : 'muted'}>{isNew(item.createdAt) ? 'New' : 'Older'}</Badge>{#if item.status === 'downloaded'}<Badge tone="default">Downloaded</Badge>{/if}</div><details><summary class="cursor-pointer list-none line-clamp-2">{item.prompt}</summary><p class="mt-2 whitespace-pre-wrap border-t border-border/60 pt-2 text-card-foreground">{item.prompt}</p></details></td><td class="whitespace-nowrap px-4 py-3">{item.assetType}</td><td class="whitespace-nowrap px-4 py-3">{item.status === 'downloaded' ? 'Downloaded' : 'Saved'}</td><td class="px-4 py-3"><Badge tone={item.confidence === 'high' ? 'success' : item.confidence === 'low' ? 'warning' : 'muted'}>{item.confidence}</Badge></td><td class="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td><td class="px-4 py-3"><div class="flex gap-1"><Button size="icon" variant="ghost" ariaLabel="Copy prompt" on:click={() => copy(item)}>{#if copiedId === item.id}<span class="text-[10px] text-success">OK</span>{:else}<Copy size={13} />{/if}</Button><Button size="icon" variant="ghost" ariaLabel="Delete prompt" on:click={() => deletePrompt(item)}><Trash2 size={13} /></Button></div></td></tr>{/each}</tbody></table></div>{/if}
                {#if group.prompts.length < group.promptCount}<div class="border-t border-border px-4 py-3 text-center"><Button size="sm" variant="outline" on:click={() => loadPrompts(group, group.prompts.length)} disabled={loadingMoreGroupId === group.id || selectingGroupId === group.id}>{#if loadingMoreGroupId === group.id}<LoaderCircle size={13} class="animate-spin" /> Loading{:else}Load more ({group.promptCount - group.prompts.length} remaining){/if}</Button></div>{/if}
              {/if}
            </div>
          {/each}
        </div></section>
      {/each}
    </div>
  {/if}
</Card>
