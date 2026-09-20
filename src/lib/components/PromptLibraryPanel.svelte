<script lang="ts">
  import { onMount } from 'svelte';
  import { Copy, Download, LoaderCircle, RefreshCw, Trash2 } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { api } from '$lib/api';
  import type { PromptGenerationSet, SavedPrompt } from '$lib/types';

  let groups: PromptGenerationSet[] = [];
  let loading = true;
  let error = '';
  let deletingId = '';
  let copiedId = '';
  let filterQuery = '';
  let filterType = 'all';
  let filterStyle = 'all';

  $: styleOptions = Array.from(new Set(groups.map((group) => group.style).filter(Boolean))).sort();
  $: filteredGroups = groups.map((group) => ({
    ...group,
    prompts: group.prompts.filter((item) => {
      const query = filterQuery.trim().toLowerCase();
      const matchesQuery = !query || [item.title, item.prompt, item.seed].some((value) => value.toLowerCase().includes(query));
      const matchesType = filterType === 'all' || item.assetType === filterType;
      const matchesStyle = filterStyle === 'all' || group.style === filterStyle;
      return matchesQuery && matchesType && matchesStyle;
    })
  })).filter((group) => group.prompts.length);

  $: dateGroups = filteredGroups.reduce<Record<string, PromptGenerationSet[]>>((result, group) => {
    const key = new Date(group.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' });
    (result[key] ??= []).push(group);
    return result;
  }, {});

  async function load() {
    loading = true;
    try { groups = await api.listPromptLibrary(100); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt Library tidak dapat dimuat'; }
    finally { loading = false; }
  }

  async function copy(item: SavedPrompt) {
    try { await navigator.clipboard.writeText(item.prompt); copiedId = item.id; setTimeout(() => copiedId = '', 1500); }
    catch { error = 'Prompt tidak dapat disalin'; }
  }

  async function deletePrompt(item: SavedPrompt) {
    if (!window.confirm(`Hapus prompt “${item.title}”?`)) return;
    try { await api.deleteSavedPrompt(item.id); groups = groups.map((group) => ({ ...group, prompts: group.prompts.filter((prompt) => prompt.id !== item.id), promptCount: group.prompts.filter((prompt) => prompt.id !== item.id).length })).filter((group) => group.prompts.length); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt tidak dapat dihapus'; }
  }

  async function deleteSet(group: PromptGenerationSet) {
    if (!window.confirm(`Hapus seluruh generation set “${group.title}”?`)) return;
    deletingId = group.id;
    try { await api.deletePromptGenerationSet(group.id); groups = groups.filter((item) => item.id !== group.id); }
    catch (err) { error = err instanceof Error ? err.message : 'Generation set tidak dapat dihapus'; }
    finally { deletingId = ''; }
  }

  async function exportSet(group: PromptGenerationSet, format: 'csv' | 'txt') {
    try { await api.downloadPromptExport(format, group.id); }
    catch (err) { error = err instanceof Error ? err.message : 'Export generation set gagal'; }
  }

  function downloadFiltered(format: 'csv' | 'txt') {
    const prompts = filteredGroups.flatMap((group) => group.prompts);
    if (!prompts.length) return;
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const content = format === 'csv'
      ? [['generation_title', 'created_at', 'seed', 'type', 'style', 'title', 'prompt', 'confidence'], ...filteredGroups.flatMap((group) => group.prompts.map((item) => [group.title, group.createdAt, group.seed, item.assetType, group.style, item.title, item.prompt, item.confidence]))].map((row) => row.map(escapeCsv).join(',')).join('\n')
      : filteredGroups.flatMap((group) => group.prompts.map((item) => `${group.title}\n${item.title}\n${item.prompt}`)).join('\n\n');
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stockscope-prompts-filtered.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  onMount(load);
</script>

<Card>
  <div class="border-b border-border px-5 py-4"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p class="eyebrow">Prompt Library</p><h2 class="mt-1 text-base font-bold">Saved generation sets</h2><p class="mt-1 text-xs text-muted-foreground">Prompt dikelompokkan berdasarkan tanggal dan generation title.</p></div><div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" on:click={() => downloadFiltered('csv')} disabled={!filteredGroups.length}>Filtered CSV</Button><Button size="sm" variant="outline" on:click={() => downloadFiltered('txt')} disabled={!filteredGroups.length}>Filtered TXT</Button><Button size="sm" variant="ghost" on:click={load} disabled={loading}><RefreshCw size={13} class={loading ? 'animate-spin' : ''} /> Refresh</Button></div></div><div class="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_220px]"><input aria-label="Filter prompts" bind:value={filterQuery} placeholder="Filter title, seed, atau isi prompt" class="h-9 rounded-md border border-border bg-card px-3 text-xs text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" /><select aria-label="Filter output type" bind:value={filterType} class="h-9 rounded-md border border-border bg-card px-3 text-xs text-card-foreground focus:border-primary"><option value="all">All types</option><option value="images">Images</option><option value="videos">Videos</option></select><select aria-label="Filter style" bind:value={filterStyle} class="h-9 rounded-md border border-border bg-card px-3 text-xs text-card-foreground focus:border-primary"><option value="all">All styles</option>{#each styleOptions as option}<option value={option}>{option}</option>{/each}</select></div></div>
  {#if error}<p class="m-5 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error" role="alert">{error}</p>{/if}
  {#if loading}<div class="p-8 text-center text-sm text-muted-foreground">Loading Prompt Library...</div>{:else if !groups.length}<div class="p-8 text-center text-sm text-muted-foreground">Belum ada prompt yang tersimpan.</div>{:else}
    <div class="space-y-8 p-5">{#each Object.entries(dateGroups) as [date, sets]}<section><h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{date}</h3><div class="space-y-5">{#each sets as group}<div class="overflow-hidden rounded-md border border-border"><div class="flex flex-col justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center"><div><h4 class="text-sm font-bold">{group.title}</h4><p class="mt-1 text-[11px] text-muted-foreground">{group.seed} · {group.assetType} · {group.locale} · {group.prompts.length} prompts shown</p></div><div class="flex flex-wrap items-center gap-1"><Button size="sm" variant="ghost" on:click={() => exportSet(group, 'csv')}><Download size={13} /> CSV</Button><Button size="sm" variant="ghost" on:click={() => exportSet(group, 'txt')}>TXT</Button><Button size="icon" variant="ghost" ariaLabel={`Delete generation set ${group.title}`} on:click={() => deleteSet(group)} disabled={deletingId === group.id}>{#if deletingId === group.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button></div></div><div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs"><thead class="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th class="px-4 py-2">Title</th><th class="px-4 py-2">Prompt</th><th class="px-4 py-2">Type</th><th class="px-4 py-2">Confidence</th><th class="px-4 py-2">Created</th><th class="px-4 py-2">Action</th></tr></thead><tbody class="divide-y divide-border/60">{#each group.prompts as item}<tr class="align-top hover:bg-muted/30"><td class="max-w-[180px] px-4 py-3 font-semibold">{item.title}</td><td class="max-w-[420px] px-4 py-3 leading-5 text-muted-foreground"><details><summary class="cursor-pointer list-none line-clamp-2">{item.prompt}</summary><p class="mt-2 whitespace-pre-wrap border-t border-border/60 pt-2 text-card-foreground">{item.prompt}</p></details></td><td class="px-4 py-3">{item.assetType}</td><td class="px-4 py-3"><Badge tone={item.confidence === 'high' ? 'success' : item.confidence === 'low' ? 'warning' : 'muted'}>{item.confidence}</Badge></td><td class="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td><td class="px-4 py-3"><div class="flex gap-1"><Button size="icon" variant="ghost" ariaLabel={`Copy ${item.title}`} on:click={() => copy(item)}>{#if copiedId === item.id}<span class="text-[10px] text-success">OK</span>{:else}<Copy size={13} />{/if}</Button><Button size="icon" variant="ghost" ariaLabel={`Delete ${item.title}`} on:click={() => deletePrompt(item)}><Trash2 size={13} /></Button></div></td></tr>{/each}</tbody></table></div></div>{/each}</div></section>{/each}</div>
  {/if}
</Card>
