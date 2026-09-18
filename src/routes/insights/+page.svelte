<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUpRight, BarChart3, Download, Image, RefreshCw, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp } from '@lucide/svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { AiRecommendation, GlobalInsights } from '$lib/types';
  import { compactNumber, formatDate } from '$lib/utils';

  let data: GlobalInsights | null = null;
  let assetType = 'all';
  let locale = 'all';
  let category = 'all';
  let loading = true;
  let error = '';
  let aiLoading = false;
  let aiStatus = '';
  let aiRecommendations: AiRecommendation[] = [];

  $: latestAi = aiRecommendations.find((item) => item.status === 'completed') ?? aiRecommendations[0] ?? null;
  $: aiPayload = latestAi?.response && typeof latestAi.response === 'object' && !Array.isArray(latestAi.response)
    ? latestAi.response as { summary?: string; overallAssessment?: string; recommendations?: Array<{ assetConcept?: string; format?: string; keywordCluster?: string[]; rationale?: string; confidence?: string }>; cautions?: string[] }
    : null;

  async function load() {
    loading = true; error = '';
    try {
      data = await api.getGlobalInsights({ assetType, locale, category, limit: 100 });
      try { aiRecommendations = await api.getGlobalAiRecommendations(); } catch { aiRecommendations = []; }
    } catch (err) { error = err instanceof Error ? err.message : 'Global insights tidak dapat dimuat'; }
    finally { loading = false; }
  }

  async function generateGlobalAi() {
    aiLoading = true; aiStatus = ''; error = '';
    try {
      const result = await api.generateGlobalAiRecommendation({ assetType, locale, category });
      aiRecommendations = [result.recommendation, ...aiRecommendations.filter((item) => item.id !== result.recommendation.id)];
      aiStatus = 'Global recommendation selesai';
    } catch (err) { aiStatus = err instanceof Error ? err.message : 'Global recommendation gagal'; }
    finally { aiLoading = false; }
  }

  const confidenceTone = (confidence: 'low' | 'medium' | 'high') => confidence === 'high' ? 'success' : confidence === 'medium' ? 'default' : 'muted';
  onMount(load);
</script>

<svelte:head><title>Global insights — StockScope</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-6">
  <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Cross-research intelligence</p><h1 class="text-2xl font-semibold tracking-tight">Global insights</h1><p class="mt-1 text-sm text-slate-500">Ranking lintas research yang tetap dipisahkan menurut asset type, locale, dan category.</p></div>
    <div class="flex flex-wrap gap-2"><Button size="sm" on:click={generateGlobalAi} disabled={aiLoading || !data?.keywords.length}><Sparkles size={14} /> {aiLoading ? 'Generating…' : 'Generate global AI'}</Button><a href="/discover"><Button variant="outline" size="sm">Discover new ideas <ArrowUpRight size={14} /></Button></a></div>
  </div>

  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
    <div class="flex items-center gap-2 text-xs text-slate-500"><SlidersHorizontal size={14} /> Scope</div>
    <select aria-label="Filter asset type" bind:value={assetType} on:change={load} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300"><option value="all">All asset types</option><option value="images">Images</option><option value="videos">Videos</option></select>
    <select aria-label="Filter locale" bind:value={locale} on:change={load} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300"><option value="all">All locales</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select>
    <select aria-label="Filter category" bind:value={category} on:change={load} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300"><option value="all">All categories</option><option value="business">Business</option><option value="technology">Technology</option><option value="wellness">Wellness</option><option value="sustainability">Sustainability</option><option value="finance">Finance</option><option value="lifestyle">Lifestyle</option><option value="travel">Travel</option><option value="food">Food</option><option value="general">General</option></select>
    <Button variant="ghost" size="icon" ariaLabel="Refresh insights" on:click={load}><RefreshCw size={15} class={loading ? 'animate-spin' : ''} /></Button>
    <a href={api.getGlobalExportUrl({ assetType, locale, category })}><Button variant="outline" size="sm"><Download size={14} /> CSV</Button></a>
  </Card>

  {#if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}
  {#if loading}<Card className="p-12 text-center text-sm text-slate-500">Loading global insights…</Card>
  {:else if data}
    <div class="grid gap-3 sm:grid-cols-4"><Card className="p-4"><p class="text-xs text-slate-500">Effective research runs</p><p class="mt-2 text-2xl font-semibold">{data.totals.researchRuns}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Scoped keywords</p><p class="mt-2 text-2xl font-semibold">{data.totals.keywords}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Scoped assets</p><p class="mt-2 text-2xl font-semibold">{data.totals.assets}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Deduplicated snapshots</p><p class="mt-2 text-2xl font-semibold">{data.totals.snapshots}</p></Card></div>
    {#if aiStatus}<div class="rounded-md border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">{aiStatus}</div>{/if}
    {#if aiPayload}<Card className="space-y-4 border-cyan-500/20 p-4"><div><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Gemini global output</p><p class="mt-2 text-xs leading-5 text-slate-400">{aiPayload.summary}</p></div>{#if aiPayload.overallAssessment}<p class="rounded-md border border-slate-800 p-3 text-xs text-slate-400">{aiPayload.overallAssessment}</p>{/if}<div class="grid gap-3 lg:grid-cols-2">{#each aiPayload.recommendations ?? [] as item}<div class="rounded-md border border-slate-800 p-4"><div class="flex justify-between gap-2"><h3 class="text-sm font-medium">{item.assetConcept}</h3><Badge tone={item.confidence === 'high' ? 'success' : 'muted'}>{item.confidence ?? '—'}</Badge></div><p class="mt-1 text-xs text-cyan-300">{item.format}</p><p class="mt-3 text-xs text-slate-400">{item.rationale}</p><p class="mt-3 text-[11px] text-slate-500">{(item.keywordCluster ?? []).join(', ')}</p></div>{/each}</div></Card>{/if}

    {#if data.assets.length}<Card><div class="border-b border-slate-800 px-4 py-3"><h2 class="text-sm font-medium">Global asset ranking</h2><p class="mt-0.5 text-xs text-slate-500">Aset dengan score konsisten setelah deduplikasi per scope dan window harian.</p></div><div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">{#each data.assets.slice(0, 12) as item}<a href={item.assetUrl} target="_blank" rel="noreferrer" class="group overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70"><div class="relative aspect-[4/3] overflow-hidden bg-slate-900">{#if item.thumbnailUrl}<img src={item.thumbnailUrl} alt={item.title} loading="lazy" class="h-full w-full object-cover transition group-hover:scale-[1.03]" />{:else}<Image size={28} class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700" />{/if}<span class="absolute right-2 top-2 rounded bg-slate-950/85 px-2 py-1 font-mono text-xs text-cyan-200">{item.weightedScore ?? '—'}</span></div><div class="p-3"><p class="line-clamp-2 min-h-8 text-xs font-medium">{item.title || 'Untitled asset'}</p><div class="mt-2 flex items-center justify-between"><Badge tone={confidenceTone(item.confidence)}>{item.confidence}</Badge><span class="text-[10px] text-slate-600">{item.researchCount} research</span></div><p class="mt-2 font-mono text-[10px] text-slate-500">D {item.bestDownloadRank ?? '—'} · R {item.bestRelevanceRank ?? '—'} · New {item.bestRecentRank ?? '—'}</p></div></a>{/each}</div></Card>{/if}

    {#if !data.keywords.length}<Card className="p-12 text-center"><BarChart3 size={20} class="mx-auto text-slate-600" /><p class="mt-3 text-sm text-slate-400">Belum ada snapshot kandidat-v2</p><p class="mt-1 text-xs text-slate-600">Jalankan research Full agar keyword dapat dinilai lintas sort.</p></Card>
    {:else}<Card>
      <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h2 class="text-sm font-medium">Global keyword opportunities</h2><p class="mt-0.5 text-xs text-slate-500">Score dibobot menurut umur data; pengulangan pada window yang sama tidak memberi bonus.</p></div><Badge tone="muted">{data.filters.assetType} · {data.filters.locale}</Badge></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[980px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3">Keyword</th><th class="px-4 py-3">Global score</th><th class="px-4 py-3">Confidence</th><th class="px-4 py-3">Researches</th><th class="px-4 py-3">Avg rank</th><th class="px-4 py-3">Avg results</th><th class="px-4 py-3">Trend</th><th class="px-4 py-3">Observed</th></tr></thead><tbody class="divide-y divide-slate-800/70">
        {#each data.keywords as item}<tr class="hover:bg-slate-800/30"><td class="px-4 py-3"><p class="font-medium text-cyan-300">{item.keyword}</p><p class="mt-1 text-[10px] text-slate-600">{item.assetTypes.join(', ')} · {item.locales.join(', ')} · {item.categories.join(', ')}</p></td><td class="px-4 py-3"><span class="font-mono font-semibold">{item.globalOpportunityScore ?? '—'}</span><div class="mt-1 h-1 w-20 rounded bg-slate-800"><div class="h-full rounded bg-cyan-400" style={`width:${item.globalOpportunityScore ?? 0}%`}></div></div></td><td class="px-4 py-3"><Badge tone={confidenceTone(item.confidence)}>{item.confidence}</Badge></td><td class="px-4 py-3 font-mono">{item.researchCount}</td><td class="px-4 py-3 font-mono text-slate-400">{item.averageDownloadRank ?? '—'}</td><td class="px-4 py-3 font-mono text-slate-400">{item.averageResultCount === null ? '—' : compactNumber(item.averageResultCount)}</td><td class="px-4 py-3">{#if item.trend === 'up'}<span class="inline-flex items-center gap-1 text-emerald-300"><TrendingUp size={14} /> up</span>{:else if item.trend === 'down'}<span class="inline-flex items-center gap-1 text-red-300"><TrendingDown size={14} /> down</span>{:else if item.trend === 'stable'}<span class="text-slate-500">stable</span>{:else}<span class="text-slate-600">belum cukup periode</span>{/if}</td><td class="px-4 py-3 text-[10px] text-slate-600">{formatDate(item.lastObservedAt)}</td></tr>{/each}
      </tbody></table></div>
    </Card>{/if}
  {/if}
</div>
