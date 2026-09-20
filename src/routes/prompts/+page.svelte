<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Copy, Download, Image, LoaderCircle, Play, RefreshCw, Sparkles, Trash2, Video } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { api } from '$lib/api';
  import { seedPacks } from '$lib/seed-library';
  import type { AssetType, PromptGeneration, PromptQueueItem, SavedPrompt } from '$lib/types';

  const styles = ['commercial stock photography', 'editorial lifestyle', 'product still life', 'isolated subject', 'cinematic image', 'commercial stock video', 'cinematic video', 'editorial footage', 'aerial', 'macro', 'timelapse', 'minimal 3D render'];
  let seed = '';
  let category = 'business';
  let assetType: AssetType = 'images';
  let locale = 'en-GB';
  let count = 5;
  let style = 'commercial stock photography';
  let generation: PromptGeneration | null = null;
  let savedPrompts: SavedPrompt[] = [];
  let queue: PromptQueueItem[] = [];
  let selectedQueue = new Set<string>();
  let savedLoading = true;
  let queueLoading = true;
  let loading = false;
  let queueing = false;
  let queueError = '';
  let error = '';
  let deletingPromptId = '';
  let deletingQueueId = '';
  let generatingQueueId = '';
  let updatingQueueId = '';
  let copiedPrompt = '';
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function loadData() {
    savedLoading = true;
    queueLoading = true;
    try { [savedPrompts, queue] = await Promise.all([api.listSavedPrompts(200), api.listPromptQueue(200)]); selectedQueue = new Set(); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt data tidak dapat dimuat'; }
    finally { savedLoading = false; queueLoading = false; }
  }

  async function generate() {
    const value = seed.trim();
    if (!value) { error = 'Masukkan keyword atau arah visual terlebih dahulu.'; return; }
    loading = true;
    error = '';
    try { const result = await api.generatePrompts({ seed: value, category, assetType, locale, count, style }); generation = result.generation; await loadData(); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt generation gagal'; }
    finally { loading = false; }
  }

  async function addToQueue() {
    const value = seed.trim();
    if (!value) { queueError = 'Isi keyword sebelum menambah Prompt Queue.'; return; }
    queueing = true;
    queueError = '';
    try { const result = await api.queuePrompts([{ keyword: value, category, researchAssetType: assetType, promptOutputType: assetType === 'videos' ? 'video' : 'image', locale, promptCount: count, recommendedStyle: style }]); queueError = `${result.created.length} queued · ${result.duplicate.length} duplicate · ${result.rejected.length} rejected`; queue = await api.listPromptQueue(200); }
    catch (err) { queueError = err instanceof Error ? err.message : 'Prompt Queue gagal diisi'; }
    finally { queueing = false; }
  }

  function toggleQueue(id: string) {
    const next = new Set(selectedQueue);
    if (next.has(id)) next.delete(id); else if (next.size < 20) next.add(id);
    selectedQueue = next;
  }

  async function updateQueue(item: PromptQueueItem, patch: { promptCount?: number; promptOutputType?: 'image' | 'video'; recommendedStyle?: string }) {
    updatingQueueId = item.id;
    try { const updated = await api.updatePromptQueue(item.id, patch); queue = queue.map((entry) => entry.id === item.id ? updated : entry); }
    catch (err) { queueError = err instanceof Error ? err.message : 'Prompt Queue tidak dapat diperbarui'; }
    finally { updatingQueueId = ''; }
  }

  async function generateQueued(item: PromptQueueItem, confirmed = false) {
    if (item.sourceConfidence === 'low' && !confirmed) {
      if (!window.confirm(`Keyword “${item.keyword}” memiliki confidence rendah. Tetap buat prompt berdasarkan evidence terbatas?`)) return false;
      confirmed = true;
    }
    generatingQueueId = item.id;
    queueError = '';
    try { const result = await api.generatePromptQueue(item.id, confirmed); generation = result.result?.generation ?? generation; queue = await api.listPromptQueue(200); return true; }
    catch (err) { queueError = err instanceof Error ? err.message : 'Prompt Queue gagal diproses'; return false; }
    finally { generatingQueueId = ''; }
  }

  async function generateSelected() {
    const items = queue.filter((item) => selectedQueue.has(item.id) && item.status !== 'generating');
    if (!items.length) return;
    if (items.some((item) => item.sourceConfidence === 'low') && !window.confirm('Sebagian keyword memiliki confidence rendah. Tetap generate semua item terpilih?')) return;
    for (const item of items) await generateQueued(item, true);
    selectedQueue = new Set();
    await loadData();
  }

  async function removeQueued(item: PromptQueueItem) {
    deletingQueueId = item.id;
    try { await api.deletePromptQueue(item.id); queue = queue.filter((entry) => entry.id !== item.id); selectedQueue.delete(item.id); selectedQueue = new Set(selectedQueue); }
    catch (err) { queueError = err instanceof Error ? err.message : 'Item queue tidak dapat dihapus'; }
    finally { deletingQueueId = ''; }
  }

  async function cancelQueued(item: PromptQueueItem) {
    try { const updated = await api.cancelPromptQueue(item.id); queue = queue.map((entry) => entry.id === item.id ? updated : entry); selectedQueue.delete(item.id); selectedQueue = new Set(selectedQueue); }
    catch (err) { queueError = err instanceof Error ? err.message : 'Item queue tidak dapat dibatalkan'; }
  }

  async function copyPrompt(value: string, id: string) {
    try { await navigator.clipboard.writeText(value); copiedPrompt = id; if (copyTimer) clearTimeout(copyTimer); copyTimer = setTimeout(() => { copiedPrompt = ''; }, 1600); }
    catch { error = 'Prompt tidak dapat disalin ke clipboard'; }
  }

  async function deletePrompt(item: SavedPrompt) {
    if (!window.confirm(`Hapus prompt “${item.title}”?`)) return;
    deletingPromptId = item.id;
    try { await api.deleteSavedPrompt(item.id); savedPrompts = savedPrompts.filter((prompt) => prompt.id !== item.id); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt tidak dapat dihapus'; }
    finally { deletingPromptId = ''; }
  }

  async function exportPrompts(format: 'csv' | 'txt') { try { await api.downloadPromptExport(format); } catch (err) { error = err instanceof Error ? err.message : 'Export prompt gagal'; } }
  onMount(loadData);
  onDestroy(() => { if (copyTimer) clearTimeout(copyTimer); });
</script>

<svelte:head><title>Prompt Studio | StockScope</title></svelte:head>
<div class="mx-auto max-w-6xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p class="eyebrow">Prompt studio</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Turn market signals into prompts.</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Prompt Queue terpisah dari Research Queue. Masukkan keyword dari AI Readout, tentukan jumlah output, lalu jalankan saat siap.</p></div><a href="/insights"><Button variant="outline" size="sm"><Sparkles size={14} /> Open Global insight</Button></a></section>

  <Card className="p-5 sm:p-6"><div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={18} /></div><div><p class="text-xs font-bold uppercase tracking-wider text-primary">Create or queue</p><h2 class="mt-1 text-lg font-bold">Start from a keyword</h2><p class="mt-1 text-xs leading-5 text-muted-foreground">AI memakai keyword scoring dan evidence global. Queue tidak memanggil Gemini sampai Anda menekan Generate.</p></div></div>
    <form class="mt-6 space-y-5" on:submit|preventDefault={generate}><div class="space-y-2"><label for="prompt-seed" class="text-sm font-semibold">Keyword or visual direction</label><Input id="prompt-seed" bind:value={seed} placeholder="e.g. remote work collaboration" /></div><div class="grid gap-4 sm:grid-cols-3"><div class="space-y-2"><label for="prompt-category" class="text-sm font-semibold">Category</label><select id="prompt-category" bind:value={category} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary">{#each seedPacks as item}<option value={item.id}>{item.label}</option>{/each}</select></div><div class="space-y-2"><label for="prompt-locale" class="text-sm font-semibold">Locale</label><select id="prompt-locale" bind:value={locale} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select></div><div class="space-y-2"><label for="prompt-count" class="text-sm font-semibold">Prompt count</label><select id="prompt-count" bind:value={count} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value={3}>3 focused</option><option value={5}>5 balanced</option><option value={10}>10 varied</option><option value={20}>20 broad</option></select></div></div><div class="space-y-2"><p class="text-sm font-semibold">Output type</p><div class="grid grid-cols-2 gap-2"><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'images' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'images'}><Image size={14} /> Image</button><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'videos' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'videos'}><Video size={14} /> Video</button></div></div><div class="space-y-2"><label for="prompt-style" class="text-sm font-semibold">Visual style override <span class="font-normal text-muted-foreground">(optional)</span></label><select id="prompt-style" bind:value={style} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value="commercial stock photography">AI-guided commercial photo</option>{#each styles.filter((item) => item !== 'commercial stock photography') as item}<option value={item}>{item}</option>{/each}</select></div>{#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}{#if queueError}<div class="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning" role="alert">{queueError}</div>{/if}<div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-muted-foreground">Generate sekarang atau masukkan ke Prompt Queue untuk diproses nanti.</p><div class="flex flex-wrap gap-2"><Button type="button" variant="outline" on:click={addToQueue} disabled={queueing}>{queueing ? 'Adding...' : 'Add to Prompt Queue'}</Button><Button type="submit" disabled={loading}>{#if loading}<LoaderCircle size={15} class="animate-spin" /> Generating...{:else}<Sparkles size={15} /> Generate now{/if}</Button></div></div></form>
  </Card>

  <Card><div class="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><p class="eyebrow">Prompt Queue</p><h2 class="mt-1 text-base font-bold">Queued keyword directions</h2><p class="mt-1 text-xs text-muted-foreground">Antrian ini hanya untuk prompt; Research Queue punya halaman sendiri.</p></div><div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" on:click={generateSelected} disabled={!selectedQueue.size || Boolean(generatingQueueId)}>Generate selected ({selectedQueue.size})</Button><Button size="sm" variant="ghost" on:click={loadData} disabled={queueLoading}><RefreshCw size={13} class={queueLoading ? 'animate-spin' : ''} /> Refresh</Button></div></div>{#if queueLoading}<div class="p-8 text-center text-sm text-muted-foreground">Loading Prompt Queue...</div>{:else if !queue.length}<div class="p-8 text-center text-sm text-muted-foreground">Belum ada keyword. Tambahkan dari AI Readout atau form di atas.</div>{:else}<div class="divide-y divide-border/60">{#each queue as item}<article class="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div class="flex min-w-0 items-start gap-3"><input type="checkbox" aria-label={`Select queued ${item.keyword}`} checked={selectedQueue.has(item.id)} disabled={item.status === 'generating'} on:change={() => toggleQueue(item.id)} /><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-bold">{item.keyword}</h3><Badge tone={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : item.status === 'generating' ? 'warning' : item.status === 'cancelled' ? 'muted' : 'muted'}>{item.status}</Badge>{#if item.sourceConfidence === 'low'}<Badge tone="warning">low evidence</Badge>{/if}</div><p class="mt-1 text-xs text-muted-foreground">Source score {item.sourceScore ?? '—'} · L{item.sourceLevel ?? 0} · {item.sourceConfidence ?? 'manual'} · {item.sourceEvidence.join(' · ')}</p>{#if item.errorMessage}<p class="mt-2 text-xs text-error">{item.errorMessage}</p>{/if}</div></div><div class="flex shrink-0 flex-wrap items-center gap-2"><select aria-label={`Prompt count for ${item.keyword}`} value={item.promptCount} disabled={updatingQueueId === item.id || item.status === 'generating'} on:change={(event) => updateQueue(item, { promptCount: Number((event.currentTarget as HTMLSelectElement).value) })} class="h-8 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value={3}>3 prompts</option><option value={5}>5 prompts</option><option value={10}>10 prompts</option><option value={20}>20 prompts</option></select><select aria-label={`Style for ${item.keyword}`} value={item.recommendedStyle} disabled={updatingQueueId === item.id || item.status === 'generating'} on:change={(event) => updateQueue(item, { recommendedStyle: (event.currentTarget as HTMLSelectElement).value })} class="h-8 max-w-[180px] rounded-md border border-border bg-card px-2 text-xs text-card-foreground">{#each styles as itemStyle}<option value={itemStyle}>{itemStyle}</option>{/each}</select><select aria-label={`Output type for ${item.keyword}`} value={item.promptOutputType} disabled={updatingQueueId === item.id || item.status === 'generating'} on:change={(event) => updateQueue(item, { promptOutputType: (event.currentTarget as HTMLSelectElement).value === 'video' ? 'video' : 'image' })} class="h-8 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value="image">Image</option><option value="video">Video</option></select><Button size="sm" on:click={() => generateQueued(item)} disabled={generatingQueueId === item.id || item.status === 'generating' || item.status === 'cancelled'}><Play size={13} /> {generatingQueueId === item.id ? 'Generating...' : item.status === 'completed' ? 'Generate again' : 'Generate'}</Button>{#if item.status === 'queued' || item.status === 'failed'}<Button size="sm" variant="ghost" on:click={() => cancelQueued(item)}>Cancel</Button>{/if}<Button size="icon" variant="ghost" ariaLabel={`Delete queued ${item.keyword}`} on:click={() => removeQueued(item)} disabled={deletingQueueId === item.id}>{#if deletingQueueId === item.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button></div></article>{/each}</div>{/if}</Card>

  {#if generation?.response}<Card className="p-5 sm:p-6"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p class="eyebrow">Generated set</p><h2 class="mt-1 text-lg font-bold">Prompt ideas for “{seed.trim()}”</h2><p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{generation.response.summary}</p></div><span class="text-xs text-muted-foreground">{generation.response.prompts.length} prompts</span></div><div class="mt-5 grid gap-4 lg:grid-cols-2">{#each generation.response.prompts as item, index}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-bold">{index + 1}. {item.title}</p><p class="mt-1 text-[11px] text-muted-foreground">{item.confidence} confidence</p></div><Button size="icon" variant="ghost" ariaLabel="Copy prompt" on:click={() => copyPrompt(item.prompt, `${generation?.id}-${index}`)}><Copy size={14} /></Button></div><p class="mt-3 rounded-md bg-muted p-3 text-xs leading-5">{item.prompt}</p><p class="mt-2 text-[11px] text-muted-foreground"><span class="font-semibold">Negative:</span> {item.negativePrompt}</p><p class="mt-2 text-[11px] text-muted-foreground">{item.keywordFocus.join(' · ')}</p><p class="mt-3 text-xs leading-5 text-muted-foreground">{item.commercialRationale}</p>{#if copiedPrompt === `${generation?.id}-${index}`}<p class="mt-2 text-[11px] font-semibold text-success">Prompt disalin</p>{/if}</article>{/each}</div>{#if generation.response.cautions.length}<p class="mt-5 text-[11px] leading-5 text-muted-foreground">Catatan: {generation.response.cautions.join(' ')}</p>{/if}</Card>{/if}

  <Card><div class="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><p class="eyebrow">Prompt library</p><h2 class="mt-1 text-base font-bold">Saved prompts</h2><p class="mt-1 text-xs text-muted-foreground">Prompt yang sudah dibuat tersimpan bersama status dan waktu.</p></div><div class="flex flex-wrap gap-2"><Button size="sm" variant="ghost" on:click={loadData} disabled={savedLoading}><RefreshCw size={13} /> Refresh</Button><Button size="sm" variant="outline" on:click={() => exportPrompts('csv')} disabled={!savedPrompts.length}><Download size={13} /> CSV</Button><Button size="sm" variant="outline" on:click={() => exportPrompts('txt')} disabled={!savedPrompts.length}>TXT</Button></div></div>{#if savedLoading}<div class="p-8 text-center text-sm text-muted-foreground">Loading saved prompts...</div>{:else if !savedPrompts.length}<div class="p-8 text-center text-sm text-muted-foreground">Belum ada prompt tersimpan.</div>{:else}<div class="divide-y divide-border/60">{#each savedPrompts as item}<article class="p-5"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-bold">{item.title}</h3><Badge tone="success">{item.status}</Badge></div><p class="mt-1 text-[11px] text-muted-foreground">{item.seed} · {item.category} · {new Date(item.createdAt).toLocaleString('id-ID')}</p></div><Button size="icon" variant="ghost" ariaLabel={`Delete ${item.title}`} on:click={() => deletePrompt(item)} disabled={deletingPromptId === item.id}>{#if deletingPromptId === item.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button></div><p class="mt-3 rounded-md bg-muted p-3 text-xs leading-5">{item.prompt}</p><div class="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>Confidence: {item.confidence}</span>{#if item.keywordFocus.length}<span>{item.keywordFocus.join(' · ')}</span>{/if}</div></article>{/each}</div>{/if}</Card>
</div>
