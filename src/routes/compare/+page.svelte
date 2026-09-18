<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, GitCompare, RefreshCw } from '@lucide/svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { ResearchComparison, ResearchRun } from '$lib/types';
  import { formatDate } from '$lib/utils';

  let runs: ResearchRun[] = [];
  let firstRunId = '';
  let secondRunId = '';
  let comparison: ResearchComparison | null = null;
  let loading = true;
  let comparing = false;
  let error = '';

  $: readyRuns = runs.filter((run) => ['completed', 'partial'].includes(run.status));
  $: firstRun = runs.find((run) => run.id === firstRunId);
  $: secondRun = runs.find((run) => run.id === secondRunId);

  async function loadRuns() {
    loading = true; error = '';
    try {
      runs = await api.listRuns(100);
      if (!firstRunId && runs[0]) firstRunId = runs[0].id;
      if (!secondRunId && runs[1]) secondRunId = runs[1].id;
    } catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dimuat'; }
    finally { loading = false; }
  }
  async function compare() {
    if (!firstRunId || !secondRunId || firstRunId === secondRunId) { error = 'Pilih dua research yang berbeda.'; return; }
    comparing = true; error = '';
    try { comparison = await api.getComparison(firstRunId, secondRunId); }
    catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dibandingkan'; }
    finally { comparing = false; }
  }
  const deltaLabel = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  onMount(loadRuns);
</script>

<svelte:head><title>Compare runs — StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-6">
  <div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Historical analysis</p><h1 class="text-2xl font-semibold tracking-tight">Compare research runs</h1><p class="mt-1 text-sm text-slate-500">Bandingkan perubahan skor, keyword, dan overlap aset antar research.</p></div>
  <Card className="p-4"><div class="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto]"><select aria-label="First research to compare" bind:value={firstRunId} class="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-300"><option value="">First research</option>{#each readyRuns as run}<option value={run.id}>{run.seedKeyword} · {run.category || 'general'} · {formatDate(run.createdAt)}</option>{/each}</select><div class="hidden items-center justify-center text-slate-600 md:flex"><ArrowRight size={16} /></div><select aria-label="Second research to compare" bind:value={secondRunId} class="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-300"><option value="">Second research</option>{#each readyRuns as run}<option value={run.id}>{run.seedKeyword} · {run.category || 'general'} · {formatDate(run.createdAt)}</option>{/each}</select><Button on:click={compare} disabled={comparing || loading}><GitCompare size={14} />{comparing ? 'Comparing…' : 'Compare'}</Button></div></Card>
  {#if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}
  {#if loading}<Card className="p-12 text-center text-sm text-slate-500">Loading research…</Card>{:else if !readyRuns.length}<Card className="p-12 text-center"><p class="text-sm text-slate-400">Belum ada research yang bisa dibandingkan.</p><p class="mt-1 text-xs text-slate-600">Selesaikan minimal dua research terlebih dahulu.</p></Card>{:else if comparison}
    <div class="grid gap-3 sm:grid-cols-5">{#each Object.entries(comparison.metrics) as [key, metric]}<Card className="p-4"><p class="text-[11px] capitalize text-slate-500">{key.replace('Score', '')}</p><p class="mt-2 font-mono text-lg font-semibold text-slate-100">{metric.second}</p><p class={`mt-1 font-mono text-xs ${metric.delta > 0 ? 'text-emerald-300' : metric.delta < 0 ? 'text-red-300' : 'text-slate-500'}`}>{deltaLabel(metric.delta)} vs first</p></Card>{/each}</div>
    <Card><div class="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h2 class="text-sm font-medium">Keyword changes</h2><p class="mt-0.5 text-xs text-slate-500">Perubahan opportunity score dan Downloads rank.</p></div><Badge tone="muted">{comparison.assetOverlap.jaccardPct}% asset overlap</Badge></div><div class="overflow-x-auto"><table class="w-full min-w-[720px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3 font-medium">Keyword</th><th class="px-4 py-3 font-medium">State</th><th class="px-4 py-3 font-medium">First score</th><th class="px-4 py-3 font-medium">Second score</th><th class="px-4 py-3 font-medium">Change</th><th class="px-4 py-3 font-medium">Rank</th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each comparison.keywordChanges as item}<tr><td class="px-4 py-3 font-medium text-cyan-300">{item.keyword}</td><td class="px-4 py-3"><Badge tone={item.state === 'new' ? 'success' : item.state === 'lost' ? 'danger' : item.state === 'changed' ? 'default' : 'muted'}>{item.state}</Badge></td><td class="px-4 py-3 font-mono text-slate-500">{item.firstScore ?? '—'}</td><td class="px-4 py-3 font-mono text-slate-300">{item.secondScore ?? '—'}</td><td class={`px-4 py-3 font-mono ${item.delta && item.delta > 0 ? 'text-emerald-300' : item.delta && item.delta < 0 ? 'text-red-300' : 'text-slate-500'}`}>{item.delta === null ? '—' : deltaLabel(item.delta)}</td><td class="px-4 py-3 font-mono text-slate-500">{item.firstRank ?? '—'} → {item.secondRank ?? '—'}</td></tr>{/each}</tbody></table></div></Card>
  {:else}<Card className="p-12 text-center"><RefreshCw size={18} class="mx-auto text-slate-600" /><p class="mt-3 text-sm text-slate-400">Pilih dua research untuk melihat perbandingan.</p></Card>{/if}
</div>
