<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Clock3, Image, LoaderCircle, List, Play, RefreshCw, Trash2, Video } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { ResearchQueueItem, ResearchRun } from '$lib/types';
  import { formatDate } from '$lib/utils';

  let queueItems: ResearchQueueItem[] = [];
  let runs: ResearchRun[] = [];
  let loading = true;
  let error = '';
  let startingId = '';
  let deletingId = '';

  $: waitingItems = queueItems.filter((item) => item.status !== 'started');
  $: linkedRunIds = new Set(queueItems.filter((item) => item.researchRunId).map((item) => item.researchRunId));

  function runTone(status: ResearchRun['status']): 'default' | 'muted' | 'success' | 'warning' | 'danger' {
    if (status === 'completed') return 'success';
    if (status === 'running' || status === 'pending' || status === 'partial') return 'warning';
    if (status === 'failed') return 'danger';
    return 'muted';
  }

  function runLabel(status: ResearchRun['status']) {
    return status === 'completed' ? 'Completed' : status === 'running' ? 'Running' : status === 'pending' ? 'Pending' : status === 'partial' ? 'Partial' : status === 'failed' ? 'Failed' : 'Cancelled';
  }

  async function load(): Promise<void> {
    loading = true;
    error = '';
    try {
      [queueItems, runs] = await Promise.all([api.listResearchQueue(), api.listRuns(100)]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Research queue dan history tidak dapat dimuat';
    } finally {
      loading = false;
    }
  }

  async function start(item: ResearchQueueItem): Promise<void> {
    startingId = item.id;
    error = '';
    try {
      const result = await api.startResearchQueue(item.id);
      if (result.run) await goto(`/research/${result.run.id}`);
      else await load();
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
      queueItems = queueItems.filter((candidate) => candidate.id !== item.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Item queue tidak dapat dihapus';
    }
  }

  async function removeRun(run: ResearchRun): Promise<void> {
    if (!window.confirm(`Hapus riwayat research “${run.seedKeyword}”?`)) return;
    deletingId = run.id;
    try {
      await api.deleteResearchRun(run.id);
      runs = runs.filter((item) => item.id !== run.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Riwayat research tidak dapat dihapus';
    } finally {
      deletingId = '';
    }
  }

  onMount(load);
</script>

<svelte:head><title>Research queue | StockScope</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><p class="eyebrow">Research workspace</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Queue and research history.</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Kelola seed yang belum dijalankan dan buka kembali research manual maupun research yang dimulai dari queue.</p></div>
    <div class="flex flex-wrap gap-2"><Button variant="outline" size="sm" on:click={load} disabled={loading}><RefreshCw size={14} class={loading ? 'animate-spin' : ''} /> Refresh</Button><a href="/discover"><Button size="sm"><List size={14} /> Discover ideas</Button></a></div>
  </section>

  {#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}

  <Card>
    <div class="flex items-center justify-between border-b border-border px-5 py-4"><div><p class="eyebrow">Research queue</p><h2 class="mt-1 text-base font-bold">{waitingItems.filter((item) => item.status === 'queued').length} waiting to start</h2></div><span class="text-xs text-muted-foreground">{waitingItems.length} pending items</span></div>
    {#if loading}<div class="space-y-3 p-5"><div class="h-16 animate-pulse rounded-md bg-muted"></div><div class="h-16 animate-pulse rounded-md bg-muted"></div></div>
    {:else if !waitingItems.length}<div class="flex flex-col items-center justify-center px-5 py-12 text-center"><div class="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground"><List size={19} /></div><p class="mt-3 text-sm font-bold">Queue masih kosong</p><p class="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Gunakan Discover ideas untuk menyimpan keyword yang ingin Anda riset nanti.</p><a class="mt-5" href="/discover"><Button size="sm">Find seed ideas <ArrowRight size={14} /></Button></a></div>
    {:else}<div class="divide-y divide-border/50">{#each waitingItems as item}<div class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex min-w-0 items-center gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{#if item.assetType === 'videos'}<Video size={16} />{:else}<Image size={16} />{/if}</div><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><p class="truncate text-sm font-bold">{item.seedKeyword}</p><Badge tone="warning">{item.status === 'starting' ? 'Starting' : 'Waiting'}</Badge></div><p class="mt-1 text-xs text-muted-foreground">Full · {item.assetsPerQuery} assets · autocomplete off · {item.locale} · added {formatDate(item.createdAt)}</p>{#if item.errorMessage}<p class="mt-1 text-[11px] text-error">{item.errorMessage}</p>{/if}</div></div><div class="flex shrink-0 items-center gap-2"><span class="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><Clock3 size={13} /> {item.category}</span>{#if item.status === 'starting'}<Button size="sm" disabled><LoaderCircle size={13} class="animate-spin" /> Starting...</Button>{:else}<Button size="sm" on:click={() => start(item)} disabled={startingId === item.id}>{#if startingId === item.id}<LoaderCircle size={13} class="animate-spin" /> Starting...{:else}<Play size={13} /> Start research{/if}</Button>{/if}<Button size="icon" variant="ghost" ariaLabel={`Delete ${item.seedKeyword}`} on:click={() => remove(item)}><Trash2 size={14} /></Button></div></div>{/each}</div>{/if}
  </Card>

  <Card>
    <div class="flex items-center justify-between border-b border-border px-5 py-4"><div><p class="eyebrow">Research history</p><h2 class="mt-1 text-base font-bold">All research runs</h2></div><span class="text-xs text-muted-foreground">{runs.length} runs</span></div>
    {#if loading}<div class="space-y-3 p-5"><div class="h-16 animate-pulse rounded-md bg-muted"></div><div class="h-16 animate-pulse rounded-md bg-muted"></div></div>
    {:else if !runs.length}<div class="flex flex-col items-center justify-center px-5 py-12 text-center"><p class="text-sm font-bold">Belum ada research</p><p class="mt-1 text-xs text-muted-foreground">Research manual dan queue yang sudah dimulai akan muncul di sini.</p></div>
    {:else}<div class="divide-y divide-border/50">{#each runs as run}<div class="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex min-w-0 items-center gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">{#if run.assetType === 'videos'}<Video size={16} />{:else}<Image size={16} />{/if}</div><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><p class="truncate text-sm font-bold">{run.seedKeyword}</p><Badge tone={runTone(run.status)}>{runLabel(run.status)}</Badge><Badge tone="muted">{linkedRunIds.has(run.id) ? 'From queue' : 'Manual'}</Badge></div><p class="mt-1 text-xs text-muted-foreground">{run.mode} · {run.assetsPerQuery} assets · autocomplete {run.autocompleteEnabled ? 'on' : 'off'} · {run.locale} · {formatDate(run.createdAt)}</p>{#if ['pending', 'running'].includes(run.status)}<p class="mt-1 text-[11px] text-warning">Progress {run.progressCompleted}/{run.progressTotal || '—'}</p>{/if}{#if run.errorMessage}<p class="mt-1 text-[11px] text-error">{run.errorMessage}</p>{/if}</div></div><div class="flex shrink-0 items-center gap-2"><a href={`/research/${run.id}`}><Button size="sm" variant="outline">Open research <ArrowRight size={13} /></Button></a>{#if !['pending', 'running'].includes(run.status)}<Button size="icon" variant="ghost" ariaLabel={`Delete research ${run.seedKeyword}`} on:click={() => removeRun(run)} disabled={deletingId === run.id}>{#if deletingId === run.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button>{/if}</div></div>{/each}</div>{/if}
  </Card>
</div>
