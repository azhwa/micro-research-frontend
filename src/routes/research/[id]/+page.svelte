<script lang="ts">
  import { onMount } from 'svelte';
  import { Activity, ArrowLeft, BarChart3, Ban, Check, Download, ExternalLink, Film, Globe, Image, LoaderCircle, RefreshCw, Search, Sparkles, Tag, Trash2, X } from '@lucide/svelte';
  import { page } from '$app/state';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { AiRecommendation, ResearchEvent, ResearchKeyword, ResearchResult, ResearchRun, ResearchSummary, SortMode } from '$lib/types';
  import { compactNumber, escapeCsv, formatDate } from '$lib/utils';

  const runId = page.params.id ?? '';
  let run: ResearchRun | null = null;
  let results: ResearchResult[] = [];
  let keywords: ResearchKeyword[] = [];
  let events: ResearchEvent[] = [];
  let summary: ResearchSummary | null = null;
  let aiRecommendations: AiRecommendation[] = [];
  let detailTab: 'overview' | 'insights' = 'overview';
  let tab: 'assets' | 'keywords' = 'assets';
  let sortFilter: 'all' | SortMode = 'all';
  let search = '';
  let loading = true;
  let refreshing = false;
  let error = '';
  let aiPreparing = false;
  let aiStatus = '';
  let timer: ReturnType<typeof setInterval> | undefined;

  interface ScrapingLocationView {
    ip: string | null;
    location: string | null;
    connection: string;
    proxy: string | null;
    isp: string | null;
    note: string | null;
  }

  $: progress = run?.progressTotal ? Math.min(100, Math.round((run.progressCompleted / run.progressTotal) * 100)) : 0;
  $: uniqueAssets = new Set(results.map((result) => result.assetId)).size;
  $: uniqueQueries = new Set(results.map((result) => result.query)).size;
  $: filteredResults = results.filter((result) => (sortFilter === 'all' || result.sortMode === sortFilter) && (!search.trim() || `${result.title} ${result.query} ${result.externalId}`.toLowerCase().includes(search.toLowerCase())));
  $: filteredKeywords = keywords.filter((item) => !search.trim() || `${item.keyword} ${item.title}`.toLowerCase().includes(search.toLowerCase()));
  $: isTerminal = Boolean(run && ['completed', 'partial', 'failed', 'cancelled'].includes(run.status));
  $: latestAi = aiRecommendations.find((item) => item.status === 'completed') ?? aiRecommendations[0] ?? null;
  $: aiPayload = latestAi?.response && typeof latestAi.response === 'object' && !Array.isArray(latestAi.response) ? latestAi.response as { summary?: string; overallAssessment?: string; recommendations?: Array<{ assetConcept?: string; format?: string; titleIdeas?: string[]; keywordCluster?: string[]; rationale?: string; demandSignal?: string; competitionSignal?: string; confidence?: string }>; cautions?: string[] } : null;
  $: scrapingLocation = parseScrapingLocation(events.find((event) => event.eventType === 'scraping_location')) ?? {
    ip: null,
    location: null,
    connection: 'Not checked',
    proxy: null,
    isp: null,
    note: 'Belum ada data lokasi. Jalankan research baru untuk merekam IP.'
  };

  function metadataText(metadata: Record<string, unknown>, key: string): string | null {
    return typeof metadata[key] === 'string' && metadata[key] ? metadata[key] as string : null;
  }

  function parseScrapingLocation(event?: ResearchEvent): ScrapingLocationView | null {
    if (!event?.metadataJson) return null;
    try {
      const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
      const location = [metadataText(metadata, 'city'), metadataText(metadata, 'region'), metadataText(metadata, 'country')].filter(Boolean).join(', ') || null;
      return {
        ip: metadataText(metadata, 'ip'),
        location,
        connection: metadata.connection === 'proxy' ? 'Proxy' : 'Direct VPS',
        proxy: metadataText(metadata, 'proxy'),
        isp: metadataText(metadata, 'isp') ?? metadataText(metadata, 'organization'),
        note: metadataText(metadata, 'lookupError')
      };
    } catch {
      return null;
    }
  }

  function eventDetail(event: ResearchEvent): string {
    if (!event.metadataJson) return '';
    try {
      const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
      if (event.eventType === 'scraping_location') {
        const location = [metadataText(metadata, 'city'), metadataText(metadata, 'region'), metadataText(metadata, 'country')].filter(Boolean).join(', ');
        return [
          metadataText(metadata, 'ip') ? `IP: ${metadataText(metadata, 'ip')}` : '',
          location ? `lokasi: ${location}` : '',
          metadataText(metadata, 'isp') ? `ISP: ${metadataText(metadata, 'isp')}` : '',
          metadataText(metadata, 'lookupError') ? `lookup: ${metadataText(metadata, 'lookupError')}` : ''
        ].filter(Boolean).join(' Â· ');
      }
      const parts = [
        typeof metadata.failureType === 'string' ? `cause: ${metadata.failureType}` : '',
        typeof metadata.errorName === 'string' ? metadata.errorName : '',
        typeof metadata.pageUrl === 'string' ? metadata.pageUrl : '',
        typeof metadata.bodyPreview === 'string' && metadata.bodyPreview ? `page: ${metadata.bodyPreview}` : ''
      ].filter(Boolean);
      return parts.join(' · ');
    } catch {
      return '';
    }
  }

  async function loadData(withChildren = true) {
    if (refreshing) return;
    refreshing = true;
    try {
      run = await api.getRun(runId);
      events = (await api.getEvents(runId)).reverse();
      if (withChildren && run.status !== 'pending' && run.status !== 'running') {
        [results, keywords, summary, aiRecommendations] = await Promise.all([
          api.getResults(runId),
          api.getKeywords(runId),
          api.getSummary(runId),
          api.getAiRecommendations(runId)
        ]);
      }
      error = '';
    } catch (err) { error = err instanceof Error ? err.message : 'Tidak dapat memuat research'; }
    finally { refreshing = false; loading = false; }
  }

  async function cancel() {
    if (!run || !confirm('Batalkan research ini?')) return;
    try { run = await api.cancelRun(run.id); } catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dibatalkan'; }
  }

  async function deleteRun() {
    if (!run || !isTerminal || !confirm(`Hapus research “${run.seedKeyword}”? Semua hasil, keyword, snapshot, dan rekomendasi AI terkait akan dihapus.`)) return;
    try { await api.deleteResearchRun(run.id); window.location.href = '/'; }
    catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dihapus'; }
  }

  async function prepareAi() {
    if (!run || !isTerminal) return;
    aiPreparing = true; aiStatus = '';
    try { const result = await api.generateAiRecommendation(run.id); aiRecommendations = [result.recommendation, ...aiRecommendations.filter((item) => item.id !== result.recommendation.id)]; aiStatus = `AI selesai (${result.recommendation.status})`; }
    catch (err) { aiStatus = err instanceof Error ? err.message : 'Rekomendasi AI tidak dapat dibuat'; }
    finally { aiPreparing = false; }
  }

  function downloadCsv() {
    const rows = filteredResults.map((item) => [item.externalId, item.title, item.query, item.sortMode, item.rank, item.assetType, item.width ? `${item.width}x${item.height}` : '', item.assetUrl]);
    const csv = [['external_id', 'title', 'query', 'sort_mode', 'rank', 'asset_type', 'dimensions', 'asset_url'], ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `stockscope-${run?.seedKeyword ?? 'research'}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  onMount(() => {
    void loadData();
    timer = setInterval(() => loadData(!isTerminal), 5000);
    return () => { if (timer) clearInterval(timer); };
  });
</script>

<svelte:head><title>{run ? `${run.seedKeyword} — StockScope` : 'Research — StockScope'}</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-5">
  <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
    <div><a href="/" class="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200"><ArrowLeft size={14} /> Back to overview</a><div class="flex items-center gap-2"><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Research run</p>{#if run}<Badge tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : run.status === 'running' ? 'default' : 'warning'}>{run.status}</Badge>{/if}</div><h1 class="mt-2 text-2xl font-semibold tracking-tight">{run?.seedKeyword ?? 'Loading research…'}</h1><p class="mt-1 text-sm text-slate-500">{run?.assetType ?? 'Adobe Stock'} · {run?.locale ?? ''} · started {formatDate(run?.createdAt)}</p></div>
    <div class="flex gap-2">{#if run && ['pending', 'running'].includes(run.status)}<Button variant="destructive" size="sm" on:click={cancel}><Ban size={14} /> Cancel</Button>{:else if run && isTerminal}<Button variant="ghost" size="sm" on:click={deleteRun}><Trash2 size={14} /> Delete</Button>{/if}<Button variant="outline" size="sm" on:click={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} class={refreshing ? 'animate-spin' : ''} /> Refresh</Button></div>
  </div>

  {#if error}<div class="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><X size={15} />{error}</div>{/if}
  {#if loading}
    <Card className="p-8"><div class="flex items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} class="animate-spin" /> Loading research…</div></Card>
  {:else if run}
    <Card className="p-4 sm:p-5">
      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p class="text-xs text-slate-500">Collection progress</p><p class="mt-1 font-mono text-sm text-slate-200">{run.progressCompleted} / {run.progressTotal || '—'} queries processed</p></div><div class="flex items-center gap-2 text-xs text-slate-500">{#if run.status === 'running'}<LoaderCircle size={14} class="animate-spin text-cyan-400" /> Worker is collecting{:else if run.status === 'completed'}<Check size={14} class="text-emerald-400" /> Collection complete{:else}<span class="capitalize">{run.status}</span>{/if}</div></div>
      <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full bg-cyan-400 transition-all duration-500" style={`width: ${run.status === 'completed' ? 100 : progress}%`}></div></div>
      {#if run.errorMessage}<p class="mt-3 text-xs text-red-300">{run.errorMessage}</p>{/if}
    </Card>

    <div class="grid gap-3 sm:grid-cols-4"><Card className="p-4"><p class="text-xs text-slate-500">Suggestions</p><p class="mt-2 text-xl font-semibold">{run.maxSuggestions}</p><p class="mt-1 text-[11px] text-slate-600">Autocomplete target</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Queries</p><p class="mt-2 text-xl font-semibold">{uniqueQueries}</p><p class="mt-1 text-[11px] text-slate-600">Across sort modes</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Unique assets</p><p class="mt-2 text-xl font-semibold">{uniqueAssets}</p><p class="mt-1 text-[11px] text-slate-600">Observed assets</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Keywords</p><p class="mt-2 text-xl font-semibold text-cyan-300">{keywords.length || '—'}</p><p class="mt-1 text-[11px] text-slate-600">Detail metadata</p></Card></div>
    <div class="flex items-center gap-1 border-b border-slate-800"><button class={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${detailTab === 'overview' ? 'border-cyan-400 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'}`} on:click={() => detailTab = 'overview'}><Activity size={15} /> Overview</button><button class={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${detailTab === 'insights' ? 'border-cyan-400 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'}`} on:click={() => detailTab = 'insights'}><BarChart3 size={15} /> Insights</button></div>
    {#if scrapingLocation}
      <Card className="border-slate-800 p-4">
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div class="flex items-center gap-3">
            <div class="rounded-md bg-cyan-400/10 p-2"><Globe size={16} class="text-cyan-300" /></div>
            <div><p class="text-xs text-slate-500">Scraping connection</p><p class="mt-1 text-sm font-medium text-slate-200">{scrapingLocation.connection}{scrapingLocation.location ? ` · ${scrapingLocation.location}` : ''}</p></div>
          </div>
          <div class="text-left sm:text-right"><p class="text-[11px] text-slate-500">Public egress IP</p><p class={`font-mono text-sm ${scrapingLocation.ip ? 'text-cyan-300' : 'text-amber-300'}`}>{scrapingLocation.ip ?? 'Not available'}</p></div>
        </div>
        <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
          {#if scrapingLocation.proxy}<span>Proxy <b class="font-mono text-slate-300">{scrapingLocation.proxy}</b></span>{/if}
          {#if scrapingLocation.isp}<span>Network <b class="text-slate-300">{scrapingLocation.isp}</b></span>{/if}
          {#if scrapingLocation.note}<span class="text-amber-300">{scrapingLocation.note}</span>{/if}
        </div>
      </Card>
    {/if}
    {#if detailTab === 'insights'}
    {#if summary}
      <Card className="p-4 sm:p-5">
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">MVP scoring</p><h2 class="mt-1 text-sm font-medium">Opportunity snapshot</h2><p class="mt-1 text-xs text-slate-500">Estimasi berbasis rank, freshness, consistency, dan visible competition.</p></div><div class="text-left sm:text-right"><p class="text-[11px] text-slate-500">Opportunity score</p><p class="font-mono text-2xl font-semibold text-cyan-300">{summary.scores.opportunityScore}<span class="text-sm text-slate-600">/100</span></p></div></div>
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5"><div><p class="text-[11px] text-slate-500">Demand</p><p class="mt-1 font-mono text-sm text-slate-200">{summary.scores.demandScore}</p><div class="mt-2 h-1 rounded-full bg-slate-800"><div class="h-full rounded-full bg-cyan-400" style={`width:${summary.scores.demandScore}%`}></div></div></div><div><p class="text-[11px] text-slate-500">Low competition</p><p class="mt-1 font-mono text-sm text-slate-200">{summary.scores.competitionScore}</p><div class="mt-2 h-1 rounded-full bg-slate-800"><div class="h-full rounded-full bg-violet-400" style={`width:${summary.scores.competitionScore}%`}></div></div></div><div><p class="text-[11px] text-slate-500">Freshness</p><p class="mt-1 font-mono text-sm text-slate-200">{summary.scores.freshnessScore}</p><div class="mt-2 h-1 rounded-full bg-slate-800"><div class="h-full rounded-full bg-amber-400" style={`width:${summary.scores.freshnessScore}%`}></div></div></div><div><p class="text-[11px] text-slate-500">Consistency</p><p class="mt-1 font-mono text-sm text-slate-200">{summary.scores.consistencyScore}</p><div class="mt-2 h-1 rounded-full bg-slate-800"><div class="h-full rounded-full bg-emerald-400" style={`width:${summary.scores.consistencyScore}%`}></div></div></div><div><p class="text-[11px] text-slate-500">Query quality</p><p class="mt-1 font-mono text-sm text-slate-200">{summary.dataQuality.queryCoveragePct}%</p><div class="mt-2 h-1 rounded-full bg-slate-800"><div class="h-full rounded-full bg-slate-400" style={`width:${summary.dataQuality.queryCoveragePct}%`}></div></div></div></div>
        <div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-800 pt-3 text-[11px] text-slate-500"><span>Keyword coverage <b class="font-mono text-slate-300">{summary.dataQuality.keywordCoveragePct}%</b></span><span>Results with count <b class="font-mono text-slate-300">{summary.dataQuality.resultCountsAvailable}</b></span><span>Scoring <b class="font-mono text-slate-300">{summary.scoringVersion}</b></span></div>
      </Card>
      <Card className="flex flex-col justify-between gap-3 border-cyan-400/15 bg-cyan-400/5 p-4 sm:flex-row sm:items-center"><div><div class="flex items-center gap-2"><Sparkles size={15} class="text-cyan-300" /><h2 class="text-sm font-medium">AI recommendation</h2></div><p class="mt-1 text-xs text-slate-500">Gemini memakai API key Anda untuk memberi rekomendasi. AI hanya memberi rekomendasi, bukan klaim jumlah download.</p>{#if aiStatus}<p class="mt-2 text-xs text-cyan-300">{aiStatus}</p>{/if}</div><Button variant="outline" size="sm" on:click={prepareAi} disabled={aiPreparing || !isTerminal}>{aiPreparing ? 'Generating…' : 'Generate recommendation'}</Button></Card>
      {#if aiPayload}
        <Card className="space-y-4 border-cyan-400/15 bg-cyan-400/5 p-4">
          <div><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Gemini output</p><h2 class="mt-1 text-sm font-medium">Recommended asset ideas</h2><p class="mt-2 text-xs leading-5 text-slate-400">{aiPayload.summary}</p></div>
          {#if aiPayload.overallAssessment}<p class="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">{aiPayload.overallAssessment}</p>{/if}
          <div class="grid gap-3 lg:grid-cols-2">{#each aiPayload.recommendations ?? [] as item}<div class="rounded-md border border-slate-800 bg-slate-950/60 p-4"><div class="flex items-start justify-between gap-3"><h3 class="text-sm font-medium text-slate-200">{item.assetConcept}</h3><Badge tone={item.confidence === 'high' ? 'success' : item.confidence === 'medium' ? 'default' : 'muted'}>{item.confidence ?? '—'}</Badge></div><p class="mt-1 text-xs text-cyan-300">{item.format}</p><p class="mt-3 text-xs leading-5 text-slate-400">{item.rationale}</p><p class="mt-3 text-[11px] text-slate-500">Titles: {(item.titleIdeas ?? []).join(' · ')}</p><p class="mt-2 text-[11px] text-slate-500">Keywords: {(item.keywordCluster ?? []).join(', ')}</p><div class="mt-3 flex gap-3 text-[11px]"><span class="text-emerald-300">Demand: {item.demandSignal}</span><span class="text-amber-300">Competition: {item.competitionSignal}</span></div></div>{/each}</div>
          {#if aiPayload.cautions?.length}<div class="border-t border-slate-800 pt-3 text-xs text-amber-200">{#each aiPayload.cautions as caution}<p>• {caution}</p>{/each}</div>{/if}
        </Card>
      {:else if latestAi?.status === 'failed'}
        <Card className="border-red-500/20 bg-red-500/5 p-4 text-xs text-red-300">Rekomendasi AI gagal: {latestAi.errorMessage ?? 'unknown error'}</Card>
      {/if}
      {#if summary.topKeywords.length}
        <Card>
          <div class="border-b border-slate-800 px-4 py-3"><h2 class="text-sm font-medium">Top keyword opportunities</h2><p class="mt-0.5 text-xs text-slate-500">Keyword dengan sinyal demand dan kompetisi terbaik.</p></div>
          <div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3 font-medium">Keyword</th><th class="px-4 py-3 font-medium">Score</th><th class="px-4 py-3 font-medium">Downloads rank</th><th class="px-4 py-3 font-medium">Result count</th><th class="px-4 py-3 font-medium">Assets</th><th class="px-4 py-3 font-medium">Source</th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each summary.topKeywords.slice(0, 10) as item}<tr class="hover:bg-slate-800/30"><td class="px-4 py-3 font-medium text-cyan-300">{item.keyword}</td><td class="px-4 py-3"><span class="font-mono font-semibold text-slate-100">{item.opportunityScore}</span><div class="mt-1 h-1 w-20 rounded-full bg-slate-800"><div class="h-full rounded-full bg-cyan-400" style={`width:${item.opportunityScore}%`}></div></div></td><td class="px-4 py-3 font-mono text-slate-300">{item.bestDownloadRank ?? '—'}</td><td class="px-4 py-3 font-mono text-slate-400">{item.resultCount ?? '—'}</td><td class="px-4 py-3 font-mono text-slate-400">{item.assetCount || '—'}</td><td class="max-w-[220px] truncate px-4 py-3 text-[11px] text-slate-500">{item.source}</td></tr>{/each}</tbody></table></div>
        </Card>
      {/if}
      {#if summary.topAssets.length}
        <Card>
          <div class="border-b border-slate-800 px-4 py-3"><h2 class="text-sm font-medium">Top assets</h2><p class="mt-0.5 text-xs text-slate-500">Asset yang paling konsisten muncul di hasil observasi.</p></div>
          <div class="divide-y divide-slate-800/70">{#each summary.topAssets.slice(0, 8) as item}<a href={item.assetUrl} target="_blank" rel="noreferrer" class="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30"><div class="h-9 w-14 shrink-0 overflow-hidden rounded bg-slate-800">{#if item.thumbnailUrl}<img src={item.thumbnailUrl} alt="" loading="lazy" class="h-full w-full object-cover" />{:else}<Image size={15} class="m-3 text-slate-600" />{/if}</div><div class="min-w-0 flex-1"><p class="truncate text-xs font-medium text-slate-200">{item.title || 'Untitled asset'}</p><p class="mt-1 font-mono text-[10px] text-slate-600">#{item.externalId} · {item.appearances} appearances · {item.keywordCount} keywords</p></div><div class="text-right"><p class="font-mono text-xs font-semibold text-cyan-300">{item.assetScore}</p><p class="text-[10px] text-slate-600">asset score</p></div><ExternalLink size={14} class="shrink-0 text-slate-600" /></a>{/each}</div>
        </Card>
      {/if}
    {/if}
    {:else}
    <Card>
      <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div class="flex items-center gap-2"><Activity size={15} class="text-cyan-400" /><div><h2 class="text-sm font-medium">Live activity</h2><p class="mt-0.5 text-xs text-slate-500">Event worker terakhir · refresh setiap 3 detik</p></div></div>{#if !isTerminal}<span class="flex items-center gap-1.5 text-[11px] text-emerald-400"><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>Live</span>{/if}</div>
      {#if !events.length}<div class="px-4 py-5 text-xs text-slate-600">Belum ada event. Event akan muncul saat worker memulai proses.</div>{:else}<div class="max-h-64 divide-y divide-slate-800/60 overflow-y-auto">{#each events as event}<div class="flex gap-3 px-4 py-2.5 text-xs"><span class={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${event.level === 'success' ? 'bg-emerald-400' : event.level === 'warning' ? 'bg-amber-400' : event.level === 'error' ? 'bg-red-400' : 'bg-cyan-400'}`}></span><div class="min-w-0 flex-1"><p class={`${event.level === 'error' ? 'text-red-300' : 'text-slate-300'}`}>{event.message}</p>{#if eventDetail(event)}<p class="mt-1 break-words font-mono text-[10px] text-slate-500">{eventDetail(event)}</p>{/if}<p class="mt-0.5 font-mono text-[10px] text-slate-600">{formatDate(event.createdAt)} · {event.eventType}</p></div></div>{/each}</div>{/if}
    </Card>

    <Card>
      <div class="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between"><div class="flex items-center gap-1 rounded-md bg-slate-950 p-1"><button class={`rounded px-3 py-1.5 text-xs ${tab === 'assets' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} on:click={() => tab = 'assets'}><Image size={13} class="mr-1 inline" /> Assets</button><button class={`rounded px-3 py-1.5 text-xs ${tab === 'keywords' ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`} on:click={() => tab = 'keywords'}><Tag size={13} class="mr-1 inline" /> Keywords</button></div><div class="flex flex-col gap-2 sm:flex-row"><div class="relative"><Search size={14} class="absolute left-2.5 top-2.5 text-slate-600" /><input aria-label={tab === 'assets' ? 'Filter assets' : 'Filter keywords'} bind:value={search} placeholder={tab === 'assets' ? 'Filter assets…' : 'Filter keywords…'} class="h-8 w-full rounded-md border border-slate-700 bg-slate-950 pl-8 pr-3 text-xs outline-none placeholder:text-slate-600 focus:border-cyan-400 sm:w-52" /></div>{#if tab === 'assets'}<select aria-label="Filter sort mode" bind:value={sortFilter} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-cyan-400"><option value="all">All sort modes</option><option value="downloads">Downloads</option><option value="relevance">Relevance</option><option value="recent">Most recent</option></select><Button size="sm" variant="outline" on:click={downloadCsv} disabled={!filteredResults.length}><Download size={13} /> CSV</Button>{/if}</div></div>

      {#if tab === 'assets'}
        {#if !filteredResults.length}<div class="px-4 py-14 text-center text-sm text-slate-500">{isTerminal ? 'Belum ada asset yang tersimpan untuk filter ini.' : 'Hasil akan muncul setelah worker selesai memproses query.'}</div>{:else}<div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3 font-medium">Asset</th><th class="px-4 py-3 font-medium">Query</th><th class="px-4 py-3 font-medium">Sort</th><th class="px-4 py-3 font-medium">Rank</th><th class="px-4 py-3 font-medium">Size</th><th class="px-4 py-3 font-medium"></th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each filteredResults as item}<tr class="hover:bg-slate-800/30"><td class="max-w-[340px] px-4 py-3"><div class="flex items-center gap-3"><div class="h-10 w-14 shrink-0 overflow-hidden rounded bg-slate-800">{#if item.thumbnailUrl}<img src={item.thumbnailUrl} alt="" loading="lazy" class="h-full w-full object-cover" />{:else}{#if item.assetType === 'videos'}<Film size={15} class="m-3 text-slate-600" />{:else}<Image size={15} class="m-3 text-slate-600" />{/if}{/if}</div><div class="min-w-0"><p class="truncate font-medium text-slate-200" title={item.title}>{item.title || 'Untitled asset'}</p><p class="mt-1 font-mono text-[10px] text-slate-600">#{item.externalId} {#if item.isPremium}<span class="text-amber-400">· Premium</span>{/if}</p></div></div></td><td class="max-w-[170px] truncate px-4 py-3 text-slate-400">{item.query}</td><td class="px-4 py-3"><Badge tone={item.sortMode === 'downloads' ? 'default' : 'muted'}>{item.sortMode}</Badge></td><td class="px-4 py-3 font-mono font-semibold text-slate-200">{item.rank}</td><td class="px-4 py-3 font-mono text-slate-500">{item.width && item.height ? `${item.width}×${item.height}` : '—'}</td><td class="px-4 py-3 text-right"><a href={item.assetUrl} target="_blank" rel="noreferrer" class="inline-flex text-slate-500 hover:text-cyan-300" aria-label="Open on Adobe Stock"><ExternalLink size={15} /></a></td></tr>{/each}</tbody></table></div>{/if}
      {:else}
        {#if !filteredKeywords.length}<div class="space-y-2 px-4 py-14 text-center"><Tag size={18} class="mx-auto text-slate-600" /><p class="text-sm text-slate-400">Belum ada keyword detail</p><p class="mx-auto max-w-md text-xs leading-5 text-slate-600">Keyword resmi dari halaman detail Adobe disimpan terpisah. Saat ini halaman search dan ranking tetap dapat digunakan untuk riset.</p></div>{:else}<div class="overflow-x-auto"><table class="w-full min-w-[620px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3 font-medium">Keyword</th><th class="px-4 py-3 font-medium">Asset</th><th class="px-4 py-3 font-medium">Position</th><th class="px-4 py-3 font-medium">Source</th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each filteredKeywords as item}<tr class="hover:bg-slate-800/30"><td class="px-4 py-3 font-medium text-cyan-300">{item.keyword}</td><td class="max-w-[380px] truncate px-4 py-3 text-slate-400">{item.title}</td><td class="px-4 py-3 font-mono text-slate-300">{item.position}</td><td class="px-4 py-3"><Badge tone="muted">{item.source}</Badge></td></tr>{/each}</tbody></table></div>{/if}
      {/if}
    </Card>
    {/if}
  {:else}<Card className="p-8 text-center text-sm text-slate-500">Research tidak ditemukan.</Card>{/if}
</div>
