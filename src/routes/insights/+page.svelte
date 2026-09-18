<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUpRight, BarChart3, Download, RefreshCw, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp } from '@lucide/svelte';
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
  $: aiPayload = latestAi?.response && typeof latestAi.response === 'object' && !Array.isArray(latestAi.response) ? latestAi.response as { summary?: string; overallAssessment?: string; recommendations?: Array<{ assetConcept?: string; format?: string; titleIdeas?: string[]; keywordCluster?: string[]; rationale?: string; demandSignal?: string; competitionSignal?: string; confidence?: string }>; cautions?: string[] } : null;

  async function load() {
    loading = true; error = '';
    try {
      data = await api.getGlobalInsights({ assetType, locale, category, limit: 100 });
      try { aiRecommendations = await api.getGlobalAiRecommendations(); } catch { aiRecommendations = []; }
    }
    catch (err) { error = err instanceof Error ? err.message : 'Global insights tidak dapat dimuat'; }
    finally { loading = false; }
  }

  async function generateGlobalAi() {
    aiLoading = true; aiStatus = ''; error = '';
    try {
      const result = await api.generateGlobalAiRecommendation({ assetType, locale, category });
      aiRecommendations = [result.recommendation, ...aiRecommendations.filter((item) => item.id !== result.recommendation.id)];
      aiStatus = 'Global recommendation selesai';
    } catch (err) {
      aiStatus = err instanceof Error ? err.message : 'Global recommendation gagal';
    } finally { aiLoading = false; }
  }

  const confidenceTone = (confidence: 'low' | 'medium' | 'high') => confidence === 'high' ? 'success' : confidence === 'medium' ? 'default' : 'muted';
  onMount(load);
</script>

<svelte:head><title>Global insights — StockScope</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-6">
  <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Cross-research intelligence</p><h1 class="text-2xl font-semibold tracking-tight">Global insights</h1><p class="mt-1 text-sm text-slate-500">Keyword yang konsisten muncul dari beberapa research, bukan hanya satu snapshot.</p></div><div class="flex flex-wrap gap-2"><Button size="sm" on:click={generateGlobalAi} disabled={aiLoading || !data?.keywords.length}><Sparkles size={14} /> {aiLoading ? 'Generating…' : 'Generate global AI'}</Button><a href="/discover"><Button variant="outline" size="sm">Discover new ideas <ArrowUpRight size={14} /></Button></a></div></div>
  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div class="flex items-center gap-2 text-xs text-slate-500"><SlidersHorizontal size={14} /> Scope</div><select aria-label="Filter asset type" bind:value={assetType} on:change={load} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-cyan-400"><option value="all">All asset types</option><option value="images">Images</option><option value="videos">Videos</option></select><select aria-label="Filter locale" bind:value={locale} on:change={load} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-cyan-400"><option value="all">All locales</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select><Button variant="ghost" size="icon" ariaLabel="Refresh insights" on:click={load}><RefreshCw size={15} class={loading ? 'animate-spin' : ''} /></Button></Card>
  <div class="flex flex-wrap items-center gap-2"><select aria-label="Filter category" bind:value={category} on:change={load} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-cyan-400"><option value="all">All categories</option><option value="business">Business</option><option value="technology">Technology</option><option value="wellness">Wellness</option><option value="sustainability">Sustainability</option><option value="finance">Finance</option><option value="lifestyle">Lifestyle</option><option value="travel">Travel</option><option value="food">Food</option><option value="general">General</option></select><a href={api.getGlobalExportUrl({ assetType, locale, category })}><Button variant="outline" size="sm"><Download size={14} /> Export CSV</Button></a></div>
  {#if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}
  {#if loading}<Card className="p-12 text-center text-sm text-slate-500">Loading global insights…</Card>{:else if data}
    <div class="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p class="text-xs text-slate-500">Research runs</p><p class="mt-2 text-2xl font-semibold">{data.totals.researchRuns}</p><p class="mt-1 text-[11px] text-slate-600">With score snapshots</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Unique keywords</p><p class="mt-2 text-2xl font-semibold">{data.totals.keywords}</p><p class="mt-1 text-[11px] text-slate-600">Normalized vocabulary</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Snapshots</p><p class="mt-2 text-2xl font-semibold">{data.totals.snapshots}</p><p class="mt-1 text-[11px] text-slate-600">Cross-run observations</p></Card></div>
    {#if aiStatus}<div class="rounded-md border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">{aiStatus}</div>{/if}
    {#if aiPayload}<Card className="space-y-4 border-cyan-500/20 p-4"><div><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Gemini global output</p><h2 class="mt-1 text-sm font-medium">Recommended asset ideas across all research</h2><p class="mt-2 text-xs leading-5 text-slate-400">{aiPayload.summary}</p></div>{#if aiPayload.overallAssessment}<p class="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">{aiPayload.overallAssessment}</p>{/if}<div class="grid gap-3 lg:grid-cols-2">{#each aiPayload.recommendations ?? [] as item}<div class="rounded-md border border-slate-800 bg-slate-950/60 p-4"><div class="flex items-start justify-between gap-3"><h3 class="text-sm font-medium text-slate-200">{item.assetConcept}</h3><Badge tone={item.confidence === 'high' ? 'success' : item.confidence === 'medium' ? 'default' : 'muted'}>{item.confidence ?? '—'}</Badge></div><p class="mt-1 text-xs text-cyan-300">{item.format}</p><p class="mt-3 text-xs leading-5 text-slate-400">{item.rationale}</p><p class="mt-3 text-[11px] text-slate-500">Titles: {(item.titleIdeas ?? []).join(' · ')}</p><p class="mt-2 text-[11px] text-slate-500">Keywords: {(item.keywordCluster ?? []).join(', ')}</p><div class="mt-3 flex gap-3 text-[11px]"><span class="text-emerald-300">Demand: {item.demandSignal}</span><span class="text-amber-300">Competition: {item.competitionSignal}</span></div></div>{/each}</div>{#if aiPayload.cautions?.length}<div class="border-t border-slate-800 pt-3 text-xs text-amber-200">{#each aiPayload.cautions as caution}<p>• {caution}</p>{/each}</div>{/if}</Card>{/if}
    {#if !data.keywords.length}<Card className="p-12 text-center"><BarChart3 size={20} class="mx-auto text-slate-600" /><p class="mt-3 text-sm text-slate-400">Belum ada global snapshot</p><p class="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-600">Jalankan beberapa research dari halaman Discover agar keyword dapat dibandingkan lintas run.</p></Card>{:else}<Card><div class="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h2 class="text-sm font-medium">Global keyword opportunities</h2><p class="mt-0.5 text-xs text-slate-500">Score mendapat bonus jika keyword muncul di beberapa research.</p></div><Badge tone="muted">{data.filters.assetType} · {data.filters.locale}</Badge></div><div class="overflow-x-auto"><table class="w-full min-w-[980px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3 font-medium">Keyword</th><th class="px-4 py-3 font-medium">Global score</th><th class="px-4 py-3 font-medium">Confidence</th><th class="px-4 py-3 font-medium">Researches</th><th class="px-4 py-3 font-medium">Avg rank</th><th class="px-4 py-3 font-medium">Avg results</th><th class="px-4 py-3 font-medium">Trend</th><th class="px-4 py-3 font-medium"></th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each data.keywords as item}<tr class="hover:bg-slate-800/30"><td class="px-4 py-3"><p class="font-medium text-cyan-300">{item.keyword}</p><p class="mt-1 max-w-[260px] truncate text-[10px] text-slate-600">{item.sources.join(', ')}</p></td><td class="px-4 py-3"><span class="font-mono font-semibold text-slate-100">{item.globalOpportunityScore ?? '—'}</span><div class="mt-1 h-1 w-20 rounded-full bg-slate-800"><div class="h-full rounded-full bg-cyan-400" style={`width:${item.globalOpportunityScore ?? 0}%`}></div></div></td><td class="px-4 py-3"><Badge tone={confidenceTone(item.confidence)}>{item.confidence}</Badge></td><td class="px-4 py-3 font-mono text-slate-300">{item.researchCount}</td><td class="px-4 py-3 font-mono text-slate-400">{item.averageDownloadRank ?? '—'}</td><td class="px-4 py-3 font-mono text-slate-400">{item.averageResultCount === null ? '—' : compactNumber(item.averageResultCount)}</td><td class="px-4 py-3">{#if item.trend === 'up'}<span class="inline-flex items-center gap-1 text-emerald-300"><TrendingUp size={14} /> up</span>{:else if item.trend === 'down'}<span class="inline-flex items-center gap-1 text-red-300"><TrendingDown size={14} /> down</span>{:else}<span class="text-slate-500">stable</span>{/if}</td><td class="px-4 py-3 text-right"><p class="text-[10px] text-slate-600">{formatDate(item.lastObservedAt)}</p></td></tr>{/each}</tbody></table></div></Card>{/if}
  {/if}
</div>
