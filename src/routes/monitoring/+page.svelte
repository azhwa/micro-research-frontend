<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Activity, RefreshCw, ShieldCheck } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import type { MonitoringSnapshot } from '$lib/types';
  import { api } from '$lib/api';
  import { formatDate } from '$lib/utils';

  let data: MonitoringSnapshot | null = null;
  let loading = true;
  let error = '';
  async function load() { loading = true; error = ''; try { data = await api.getMonitoring(); } catch (err) { error = err instanceof Error ? err.message : 'Monitoring tidak dapat dimuat'; } finally { loading = false; } }
  onMount(async () => {
    try {
      const auth = await api.getAuthMe();
      if (!auth.isAdmin) {
        await goto('/');
        return;
      }
    } catch {
      await goto('/');
      return;
    }
    await load();
  });
</script>

<svelte:head><title>Monitoring — StockScope</title></svelte:head>
<div class="mx-auto max-w-6xl space-y-6">
  <div class="flex items-end justify-between gap-4"><div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Operations</p><h1 class="text-2xl font-semibold tracking-tight">Worker monitoring</h1><p class="mt-1 text-sm text-slate-500">Kesehatan queue, scraper, dan kualitas event terbaru.</p></div><Button variant="outline" size="sm" on:click={load} disabled={loading}><RefreshCw size={14} class={loading ? 'animate-spin' : ''} /> Refresh</Button></div>
  {#if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}
  {#if loading}<Card className="p-12 text-center text-sm text-slate-500">Loading metrics…</Card>{:else if data}
    <div class="grid gap-3 sm:grid-cols-4"><Card className="p-4"><p class="text-xs text-slate-500">Active jobs</p><p class="mt-2 text-2xl font-semibold text-amber-300">{data.worker.activeJobs}</p><p class="mt-1 text-[11px] text-slate-600">Concurrency {data.worker.concurrency}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Avg duration</p><p class="mt-2 text-2xl font-semibold">{data.runs.averageDurationSeconds ?? '—'}s</p><p class="mt-1 text-[11px] text-slate-600">Completed runs sampled</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Retries</p><p class="mt-2 text-2xl font-semibold text-violet-300">{data.scraper.retries}</p><p class="mt-1 text-[11px] text-slate-600">Query retry events</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Partial runs</p><p class="mt-2 text-2xl font-semibold text-red-300">{data.scraper.partialRuns}</p><p class="mt-1 text-[11px] text-slate-600">Needs review</p></Card></div>
    <div class="grid gap-5 lg:grid-cols-2"><Card className="p-5"><div class="flex items-center gap-2"><ShieldCheck size={16} class="text-emerald-400" /><h2 class="text-sm font-medium">Worker health</h2></div><dl class="mt-5 space-y-3 text-xs"><div class="flex justify-between"><dt class="text-slate-500">Max attempts</dt><dd class="font-mono text-slate-300">{data.worker.maxAttempts}</dd></div><div class="flex justify-between"><dt class="text-slate-500">Stale threshold</dt><dd class="font-mono text-slate-300">{data.worker.staleThresholdMinutes} min</dd></div><div class="flex justify-between"><dt class="text-slate-500">Last heartbeat</dt><dd class="font-mono text-slate-300">{data.worker.lastHeartbeatAt ? formatDate(data.worker.lastHeartbeatAt) : 'No active job'}</dd></div><div class="flex justify-between"><dt class="text-slate-500">Recovered jobs</dt><dd class="font-mono text-slate-300">{data.scraper.recoveredJobs}</dd></div></dl></Card><Card className="p-5"><div class="flex items-center gap-2"><Activity size={16} class="text-cyan-400" /><h2 class="text-sm font-medium">Run status</h2></div><div class="mt-5 grid grid-cols-2 gap-3">{#each Object.entries(data.runs.byStatus) as [status, count]}<div class="rounded-md border border-slate-800 bg-slate-950 p-3"><p class="text-xs capitalize text-slate-500">{status}</p><p class="mt-1 font-mono text-lg text-slate-200">{count}</p></div>{/each}</div></Card></div>
  {/if}
</div>
