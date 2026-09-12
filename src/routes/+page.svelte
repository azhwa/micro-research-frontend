<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUpRight, Clock3, FileSearch, Image, Plus, RefreshCw, Search, Sparkles, Trash2, Video } from '@lucide/svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { ResearchRun } from '$lib/types';
  import { formatDate } from '$lib/utils';

  let runs: ResearchRun[] = [];
  let loading = true;
  let error = '';

  const statusTone = (status: ResearchRun['status']) => status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'running' ? 'default' : status === 'cancelled' ? 'muted' : 'warning';
  const statusLabel = (status: ResearchRun['status']) => ({ pending: 'Pending', running: 'Running', completed: 'Completed', partial: 'Partial', failed: 'Failed', cancelled: 'Cancelled' })[status];

  async function loadRuns() {
    loading = true;
    error = '';
    try { runs = await api.listRuns(20); } catch (err) { error = err instanceof Error ? err.message : 'Tidak dapat memuat data'; }
    finally { loading = false; }
  }

  async function deleteRun(event: MouseEvent, run: ResearchRun) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Hapus research “${run.seedKeyword}”? Semua hasil, keyword, snapshot, dan rekomendasi AI terkait akan dihapus.`)) return;
    try {
      await api.deleteResearchRun(run.id);
      runs = runs.filter((item) => item.id !== run.id);
    } catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dihapus'; }
  }

  onMount(loadRuns);
</script>

<svelte:head><title>Overview — StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-6">
  <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>
      <p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Microstock intelligence</p>
      <h1 class="text-2xl font-semibold tracking-tight text-slate-100">Research overview</h1>
      <p class="mt-1 text-sm text-slate-500">Temukan peluang konten dari autocomplete dan ranking Adobe Stock.</p>
    </div>
    <a href="/research/new"><Button><Plus size={16} /> New research</Button></a>
  </section>

  <div class="grid gap-3 sm:grid-cols-3">
    <Card className="p-4"><div class="flex items-center justify-between"><p class="text-xs text-slate-500">Total researches</p><FileSearch size={16} class="text-slate-600" /></div><p class="mt-3 text-2xl font-semibold">{runs.length}</p><p class="mt-1 text-xs text-slate-600">Riwayat tersimpan di Turso</p></Card>
    <Card className="p-4"><div class="flex items-center justify-between"><p class="text-xs text-slate-500">Completed</p><Sparkles size={16} class="text-emerald-400/70" /></div><p class="mt-3 text-2xl font-semibold text-emerald-300">{runs.filter((run) => run.status === 'completed').length}</p><p class="mt-1 text-xs text-slate-600">Siap dianalisis</p></Card>
    <Card className="p-4"><div class="flex items-center justify-between"><p class="text-xs text-slate-500">Active jobs</p><Clock3 size={16} class="text-amber-400/70" /></div><p class="mt-3 text-2xl font-semibold text-amber-300">{runs.filter((run) => ['pending', 'running'].includes(run.status)).length}</p><p class="mt-1 text-xs text-slate-600">Worker concurrency 1</p></Card>
  </div>

  <Card>
    <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div><h2 class="text-sm font-medium">Recent research</h2><p class="mt-0.5 text-xs text-slate-500">Eksperimen keyword terbaru</p></div>
      <Button variant="ghost" size="icon" ariaLabel="Refresh" on:click={loadRuns}><RefreshCw size={15} class={loading ? 'animate-spin' : ''} /></Button>
    </div>
    {#if error}
      <div class="m-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
    {:else if loading}
      <div class="space-y-3 p-4"><div class="h-10 animate-pulse rounded bg-slate-800"></div><div class="h-10 animate-pulse rounded bg-slate-800"></div></div>
    {:else if runs.length === 0}
      <div class="flex flex-col items-center justify-center px-4 py-16 text-center"><div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800"><Search size={18} class="text-slate-500" /></div><p class="text-sm font-medium">Belum ada research</p><p class="mt-1 max-w-sm text-xs text-slate-500">Mulai dari satu seed keyword untuk melihat suggestion dan ranking aset.</p><a class="mt-4" href="/research/new"><Button size="sm">Start first research</Button></a></div>
    {:else}
      <div class="divide-y divide-slate-800/80">
        {#each runs as run}
          <div class="flex items-center gap-2 pr-2 transition-colors hover:bg-slate-800/40">
          <a href={`/research/${run.id}`} class="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-400">{#if run.assetType === 'videos'}<Video size={15} />{:else}<Image size={15} />{/if}</div>
            <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="truncate text-sm font-medium text-slate-200">{run.seedKeyword}</p><Badge tone={statusTone(run.status)}>{statusLabel(run.status)}</Badge></div><p class="mt-1 text-xs text-slate-500">{run.assetType} · {run.locale} · {formatDate(run.createdAt)}</p></div>
            <div class="hidden text-right sm:block"><p class="text-xs text-slate-400">{run.progressCompleted}/{run.progressTotal || '—'} queries</p><p class="mt-1 text-[11px] text-slate-600">{run.maxSuggestions} suggestions</p></div>
            <ArrowUpRight size={15} class="shrink-0 text-slate-600" />
          </a>
          {#if !['pending', 'running'].includes(run.status)}<Button variant="ghost" size="icon" ariaLabel={`Delete ${run.seedKeyword}`} on:click={(event) => deleteRun(event, run)}><Trash2 size={15} class="text-slate-500 hover:text-red-300" /></Button>{/if}
          </div>
        {/each}
      </div>
    {/if}
  </Card>
</div>
