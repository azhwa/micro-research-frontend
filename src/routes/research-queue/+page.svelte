<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Clock3, Image, LoaderCircle, List, Play, RefreshCw, Trash2, Video } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { ResearchQueueItem } from '$lib/types';
  import { formatDate } from '$lib/utils';

  let items: ResearchQueueItem[] = [];
  let loading = true;
  let error = '';
  let startingId = '';

  async function load(): Promise<void> {
    loading = true;
    error = '';
    try {
      items = await api.listResearchQueue();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Research queue tidak dapat dimuat';
    } finally {
      loading = false;
    }
  }

  async function start(item: ResearchQueueItem): Promise<void> {
    startingId = item.id;
    error = '';
    try {
      const result = await api.startResearchQueue(item.id);
      if (result.run) {
        await goto(`/research/${result.run.id}`);
      } else {
        await load();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Research queue tidak dapat dimulai';
    } finally {
      startingId = '';
    }
  }

  async function remove(item: ResearchQueueItem): Promise<void> {
    if (!window.confirm(`Hapus “${item.seedKeyword}” dari research queue?`)) return;
    try {
      await api.deleteResearchQueue(item.id);
      items = items.filter((candidate) => candidate.id !== item.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Item queue tidak dapat dihapus';
    }
  }

  onMount(load);
</script>

<svelte:head><title>Research queue | StockScope</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><p class="eyebrow">Research queue</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Plan your next Adobe research.</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Seed yang Anda simpan tidak menjalankan crawler sampai tombol Start ditekan. Setiap item akan memakai Full mode, 100 asset, dan autocomplete mati.</p></div>
    <div class="flex flex-wrap gap-2"><Button variant="outline" size="sm" on:click={load} disabled={loading}><RefreshCw size={14} class={loading ? 'animate-spin' : ''} /> Refresh</Button><a href="/discover"><Button size="sm"><List size={14} /> Discover ideas</Button></a></div>
  </section>

  {#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}
  <Card>
    <div class="flex items-center justify-between border-b border-border px-5 py-4"><div><p class="eyebrow">Saved seeds</p><h2 class="mt-1 text-base font-bold">{items.filter((item) => item.status === 'queued').length} waiting to start</h2></div><span class="text-xs text-muted-foreground">{items.length} total items</span></div>
    {#if loading}<div class="space-y-3 p-5"><div class="h-16 animate-pulse rounded-md bg-muted"></div><div class="h-16 animate-pulse rounded-md bg-muted"></div></div>
    {:else if !items.length}<div class="flex flex-col items-center justify-center px-5 py-16 text-center"><div class="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><List size={19} /></div><p class="mt-3 text-sm font-bold">Queue masih kosong</p><p class="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Gunakan Queue seed di Discover ideas untuk menyimpan keyword yang ingin Anda riset nanti.</p><a class="mt-5" href="/discover"><Button size="sm">Find seed ideas <ArrowRight size={14} /></Button></a></div>
    {:else}<div class="divide-y divide-border/50">{#each items as item}<div class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex min-w-0 items-center gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{#if item.assetType === 'videos'}<Video size={16} />{:else}<Image size={16} />{/if}</div><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><p class="truncate text-sm font-bold">{item.seedKeyword}</p><Badge tone={item.status === 'queued' ? 'warning' : 'success'}>{item.status === 'queued' ? 'Waiting' : 'Started'}</Badge></div><p class="mt-1 text-xs text-muted-foreground">Full · {item.assetsPerQuery} assets · autocomplete off · {item.locale} · added {formatDate(item.createdAt)}</p>{#if item.errorMessage}<p class="mt-1 text-[11px] text-error">{item.errorMessage}</p>{/if}</div></div><div class="flex shrink-0 items-center gap-2"><span class="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><Clock3 size={13} /> {item.category}</span>{#if item.researchRunId}<a href={`/research/${item.researchRunId}`}><Button size="sm" variant="outline">Open research <ArrowRight size={13} /></Button></a>{:else}<Button size="sm" on:click={() => start(item)} disabled={startingId === item.id}>{#if startingId === item.id}<LoaderCircle size={13} class="animate-spin" /> Starting...{:else}<Play size={13} /> Start research{/if}</Button>{/if}<Button size="icon" variant="ghost" ariaLabel={`Delete ${item.seedKeyword}`} on:click={() => remove(item)}><Trash2 size={14} /></Button></div></div>{/each}</div>{/if}
  </Card>
</div>
