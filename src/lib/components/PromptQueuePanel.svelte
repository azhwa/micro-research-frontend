<script lang="ts">
  import { onMount } from 'svelte';
  import { LoaderCircle, Play, RefreshCw, Trash2 } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { api } from '$lib/api';
  import type { PromptQueueItem } from '$lib/types';

  const styles = ['commercial stock photography', 'editorial lifestyle', 'product still life', 'isolated subject', 'cinematic image', 'commercial stock video', 'cinematic video', 'editorial footage', 'aerial', 'macro', 'timelapse'];
  let queue: PromptQueueItem[] = [];
  let selected = new Set<string>();
  let loading = true;
  let error = '';
  let generatingId = '';
  let updatingId = '';
  let deletingId = '';

  async function load() {
    loading = true;
    try { queue = await api.listPromptQueue(200); selected = new Set(); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt Queue tidak dapat dimuat'; }
    finally { loading = false; }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else if (next.size < 20) next.add(id);
    selected = next;
  }

  async function update(item: PromptQueueItem, patch: { promptCount?: number; promptOutputType?: 'image' | 'video'; recommendedStyle?: string }) {
    updatingId = item.id;
    try { const updated = await api.updatePromptQueue(item.id, patch); queue = queue.map((entry) => entry.id === item.id ? updated : entry); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt Queue tidak dapat diperbarui'; }
    finally { updatingId = ''; }
  }

  async function generate(item: PromptQueueItem, confirmed = false) {
    if (item.sourceConfidence === 'low' && !confirmed && !window.confirm(`Keyword “${item.keyword}” memiliki evidence rendah. Tetap generate?`)) return;
    generatingId = item.id;
    try { await api.generatePromptQueue(item.id, confirmed || item.sourceConfidence !== 'low'); await load(); }
    catch (err) { error = err instanceof Error ? err.message : 'Prompt Queue gagal diproses'; }
    finally { generatingId = ''; }
  }

  async function generateSelected() {
    const items = queue.filter((item) => selected.has(item.id) && item.status !== 'generating' && item.status !== 'cancelled');
    if (items.some((item) => item.sourceConfidence === 'low') && !window.confirm('Sebagian keyword memiliki evidence rendah. Tetap generate semua?')) return;
    for (const item of items) await generate(item, true);
    selected = new Set();
  }

  async function cancel(item: PromptQueueItem) {
    try { const updated = await api.cancelPromptQueue(item.id); queue = queue.map((entry) => entry.id === item.id ? updated : entry); selected.delete(item.id); selected = new Set(selected); }
    catch (err) { error = err instanceof Error ? err.message : 'Item queue tidak dapat dibatalkan'; }
  }

  async function remove(item: PromptQueueItem) {
    deletingId = item.id;
    try { await api.deletePromptQueue(item.id); queue = queue.filter((entry) => entry.id !== item.id); }
    catch (err) { error = err instanceof Error ? err.message : 'Item queue tidak dapat dihapus'; }
    finally { deletingId = ''; }
  }

  onMount(load);
</script>

<Card>
  <div class="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
    <div><p class="eyebrow">Prompt Queue</p><h2 class="mt-1 text-base font-bold">Queued keyword directions</h2><p class="mt-1 text-xs text-muted-foreground">Antrian prompt terpisah dari Research Queue.</p></div>
    <div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" on:click={generateSelected} disabled={!selected.size || Boolean(generatingId)}>Generate selected ({selected.size})</Button><Button size="sm" variant="ghost" on:click={load} disabled={loading}><RefreshCw size={13} class={loading ? 'animate-spin' : ''} /> Refresh</Button></div>
  </div>
  {#if error}<p class="m-5 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error" role="alert">{error}</p>{/if}
  {#if loading}<div class="p-8 text-center text-sm text-muted-foreground">Loading Prompt Queue...</div>{:else if !queue.length}<div class="p-8 text-center text-sm text-muted-foreground">Belum ada keyword di Prompt Queue.</div>{:else}
    <div class="divide-y divide-border/60">{#each queue as item}<article class="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div class="flex min-w-0 items-start gap-3"><input type="checkbox" aria-label={`Select ${item.keyword}`} checked={selected.has(item.id)} disabled={item.status === 'generating'} on:change={() => toggle(item.id)} /><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-bold">{item.keyword}</h3><Badge tone={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : item.status === 'generating' ? 'warning' : 'muted'}>{item.status}</Badge>{#if item.sourceConfidence === 'low'}<Badge tone="warning">low evidence</Badge>{/if}</div><p class="mt-1 text-xs text-muted-foreground">Score {item.sourceScore ?? '—'} · L{item.sourceLevel ?? 0} · {item.sourceConfidence ?? 'manual'} · {item.sourceEvidence.join(' · ')}</p>{#if item.errorMessage}<p class="mt-2 text-xs text-error">{item.errorMessage}</p>{/if}</div></div><div class="flex shrink-0 flex-wrap items-center gap-2"><select aria-label={`Prompt count for ${item.keyword}`} value={item.promptCount} disabled={updatingId === item.id || item.status === 'generating'} on:change={(event) => update(item, { promptCount: Number((event.currentTarget as HTMLSelectElement).value) })} class="h-8 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value={3}>3 prompts</option><option value={5}>5 prompts</option><option value={10}>10 prompts</option><option value={20}>20 prompts</option></select><select aria-label={`Style for ${item.keyword}`} value={item.recommendedStyle} disabled={updatingId === item.id || item.status === 'generating'} on:change={(event) => update(item, { recommendedStyle: (event.currentTarget as HTMLSelectElement).value })} class="h-8 max-w-[180px] rounded-md border border-border bg-card px-2 text-xs text-card-foreground">{#each styles as style}<option value={style}>{style}</option>{/each}</select><select aria-label={`Output type for ${item.keyword}`} value={item.promptOutputType} disabled={updatingId === item.id || item.status === 'generating'} on:change={(event) => update(item, { promptOutputType: (event.currentTarget as HTMLSelectElement).value === 'video' ? 'video' : 'image' })} class="h-8 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value="image">Image</option><option value="video">Video</option></select><Button size="sm" on:click={() => generate(item)} disabled={generatingId === item.id || item.status === 'generating' || item.status === 'cancelled'}><Play size={13} /> {generatingId === item.id ? 'Generating...' : item.status === 'completed' ? 'Generate again' : 'Generate'}</Button>{#if item.status === 'queued' || item.status === 'failed'}<Button size="sm" variant="ghost" on:click={() => cancel(item)}>Cancel</Button>{/if}<Button size="icon" variant="ghost" ariaLabel={`Delete ${item.keyword}`} on:click={() => remove(item)} disabled={deletingId === item.id}>{#if deletingId === item.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button></div></article>{/each}</div>
  {/if}
</Card>
