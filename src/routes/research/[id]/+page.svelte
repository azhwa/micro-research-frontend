<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Activity, ArrowLeft, Ban, BarChart3, Check, Download, ExternalLink, Globe, Image, LoaderCircle, RefreshCw, Search, Sparkles, Tag, Trash2, X } from '@lucide/svelte';
  import { page } from '$app/state';
  import Badge from '$lib/components/ui/Badge.svelte';
  import KeywordLabel from '$lib/components/KeywordLabel.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import ResearchDetailLogs from '$lib/components/research/ResearchDetailLogs.svelte';
  import { api } from '$lib/api';
  import type { AiRecommendation, ResearchDetailLog, ResearchEvent, ResearchKeyword, ResearchResult, ResearchRun, ResearchSummary, SortMode } from '$lib/types';
  import { compactNumber, escapeCsv, formatDate } from '$lib/utils';

  const runId = page.params.id ?? '';
  let run: ResearchRun | null = null;
  let results: ResearchResult[] = [];
  let keywords: ResearchKeyword[] = [];
  let events: ResearchEvent[] = [];
  let detailLogs: ResearchDetailLog[] = [];
  let summary: ResearchSummary | null = null;
  let aiRecommendations: AiRecommendation[] = [];
  let detailTab: 'overview' | 'insights' = 'overview';
  let rawTab: 'assets' | 'keywords' = 'assets';
  let sortFilter: 'all' | SortMode = 'all';
  let crossSortFilter: 'all' | 'consensus' | 'downloads' | 'fresh' = 'all';
  let search = '';
  let loading = true;
  let refreshing = false;
  let rerunning = false;
  let error = '';
  let aiPreparing = false;
  let aiStatus = '';
  let initialTabSelected = false;
  let streamController: AbortController | null = null;
  let streamRetryTimer: ReturnType<typeof setTimeout> | undefined;

  interface ScrapingLocationView { ip: string | null; location: string | null; connection: string; isp: string | null; note: string | null; }

  $: progress = run?.progressTotal ? Math.min(100, Math.round((run.progressCompleted / run.progressTotal) * 100)) : 0;
  $: researchLabel = run?.seedKeyword || (run?.mode === 'primary' ? 'Adobe Stock Page One' : 'Research');
  $: uniqueAssets = new Set(results.map((item) => item.assetId)).size;
  $: uniqueQueries = new Set(results.map((item) => item.query)).size;
  $: isTerminal = Boolean(run && ['completed', 'partial', 'failed', 'cancelled'].includes(run.status));
  $: filteredResults = results.filter((item) => (sortFilter === 'all' || item.sortMode === sortFilter) && (!search.trim() || `${item.title} ${item.query} ${item.externalId}`.toLowerCase().includes(search.toLowerCase())));
  $: filteredKeywords = keywords.filter((item) => !search.trim() || `${item.keyword} ${item.title}`.toLowerCase().includes(search.toLowerCase()));
  $: filteredOpportunityAssets = (summary?.topAssets ?? []).filter((item) => {
    const matchesText = !search.trim() || `${item.title} ${item.query} ${item.externalId}`.toLowerCase().includes(search.toLowerCase());
    const matchesSignal = crossSortFilter === 'all'
      || (crossSortFilter === 'consensus' && ['strong_consensus', 'multi_signal'].includes(item.crossSortLabel))
      || (crossSortFilter === 'downloads' && item.evidence.includes('top_download_signal'))
      || (crossSortFilter === 'fresh' && item.evidence.includes('fresh_contender'));
    return matchesText && matchesSignal;
  });
  $: latestAi = aiRecommendations.find((item) => item.status === 'completed') ?? aiRecommendations[0] ?? null;
  $: aiPayload = latestAi?.response && typeof latestAi.response === 'object' && !Array.isArray(latestAi.response)
    ? latestAi.response as { summary?: string; overallAssessment?: string; recommendations?: Array<{ assetConcept?: string; format?: string; keywordCluster?: string[]; rationale?: string; confidence?: string }> }
    : null;
  $: scrapingLocation = parseScrapingLocation(events.find((event) => event.eventType === 'scraping_location')) ?? { ip: null, location: null, connection: 'Not checked', isp: null, note: 'Belum ada data lokasi.' };

  function metadataText(metadata: Record<string, unknown>, key: string) {
    return typeof metadata[key] === 'string' && metadata[key] ? metadata[key] as string : null;
  }

  function parseScrapingLocation(event?: ResearchEvent): ScrapingLocationView | null {
    if (!event?.metadataJson) return null;
    try {
      const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
      return {
        ip: metadataText(metadata, 'ip'),
        location: [metadataText(metadata, 'city'), metadataText(metadata, 'region'), metadataText(metadata, 'country')].filter(Boolean).join(', ') || null,
        connection: metadata.connection === 'proxy' ? 'Proxy' : 'Direct VPS',
        isp: metadataText(metadata, 'isp') ?? metadataText(metadata, 'organization'),
        note: metadataText(metadata, 'lookupError')
      };
    } catch { return null; }
  }

  function eventDetail(event: ResearchEvent) {
    if (!event.metadataJson) return '';
    try {
      const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
      if (event.eventType === 'scraping_location') {
        const location = [metadataText(metadata, 'city'), metadataText(metadata, 'region'), metadataText(metadata, 'country')].filter(Boolean).join(', ');
        return [metadataText(metadata, 'ip') ? `IP: ${metadataText(metadata, 'ip')}` : '', location ? `lokasi: ${location}` : '', metadataText(metadata, 'isp') ? `ISP: ${metadataText(metadata, 'isp')}` : ''].filter(Boolean).join(' · ');
      }
      return [typeof metadata.failureType === 'string' ? `cause: ${metadata.failureType}` : '', typeof metadata.errorName === 'string' ? metadata.errorName : '', typeof metadata.pageUrl === 'string' ? metadata.pageUrl : ''].filter(Boolean).join(' · ');
    } catch { return ''; }
  }

  function scoreText(value: number | null) { return value === null ? '—' : value.toFixed(1).replace('.0', ''); }
  function levelClass(level: number) {
    if (level >= 5) return 'bg-primary';
    if (level === 4) return 'bg-secondary';
    if (level === 3) return 'bg-success';
    if (level === 2) return 'bg-warning';
    return 'bg-muted-foreground';
  }

  async function loadData(withChildren = true) {
    if (refreshing) return;
    refreshing = true;
    try {
      run = await api.getRun(runId);
      const [nextEvents, nextDetailLogs] = await Promise.all([
        api.getEvents(runId),
        api.getDetailLogs(runId)
      ]);
      events = nextEvents.reverse();
      detailLogs = nextDetailLogs;
      if (withChildren && run.status !== 'pending' && run.status !== 'running') {
        [results, keywords, summary, aiRecommendations] = await Promise.all([api.getResults(runId), api.getKeywords(runId), api.getSummary(runId, 100), api.getAiRecommendations(runId)]);
        if (!initialTabSelected) { detailTab = 'insights'; initialTabSelected = true; }
      }
      error = '';
    } catch (err) { error = err instanceof Error ? err.message : 'Tidak dapat memuat research'; }
    finally { refreshing = false; loading = false; }
  }

  function scheduleStreamReconnect() {
    if (streamRetryTimer || isTerminal) return;
    streamRetryTimer = setTimeout(() => {
      streamRetryTimer = undefined;
      connectResearchStream();
    }, 3000);
  }

  function connectResearchStream() {
    streamController?.abort();
    streamController = api.connectResearchStream(runId, (event, payload) => {
      if (event === 'snapshot' && payload && typeof payload === 'object') {
        const snapshot = payload as { run?: ResearchRun; events?: ResearchEvent[]; detailLogs?: ResearchDetailLog[] };
        if (snapshot.run) run = snapshot.run;
        if (snapshot.events) events = [...snapshot.events].reverse();
        if (snapshot.detailLogs) detailLogs = snapshot.detailLogs;
        error = '';
        loading = false;
      } else if (event === 'complete') {
        void loadData(true);
      } else if (event === 'error' || event === 'close') {
        const status = payload && typeof payload === 'object' && 'status' in payload ? payload.status : null;
        if (status === 401) {
          error = 'Session login berakhir. Silakan login kembali.';
          void goto('/sign-in?reason=session-expired');
        } else if (!isTerminal) {
          scheduleStreamReconnect();
        }
      }
    });
  }

  async function cancel() {
    if (!run || !confirm('Batalkan research ini?')) return;
    try { run = await api.cancelRun(run.id); } catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dibatalkan'; }
  }

  async function deleteRun() {
    if (!run || !isTerminal || !confirm(`Hapus research “${run.seedKeyword}”? Semua data terkait akan dihapus.`)) return;
    try { await api.deleteResearchRun(run.id); window.location.href = '/'; }
    catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dihapus'; }
  }

  async function rerunResearch() {
    if (!run) return;
    rerunning = true; error = '';
    try {
      const created = await api.createRun({ keyword: run.seedKeyword, category: run.category, assetType: run.assetType, locale: run.locale, maxSuggestions: run.maxSuggestions, assetsPerQuery: run.assetsPerQuery, autocompleteEnabled: run.autocompleteEnabled, mode: run.mode });
      window.location.href = `/research/${created.id}`;
    } catch (err) { error = err instanceof Error ? err.message : 'Research ulang gagal dibuat'; }
    finally { rerunning = false; }
  }

  async function prepareAi() {
    if (!run || !isTerminal) return;
    aiPreparing = true; aiStatus = '';
    try {
      const result = await api.generateAiRecommendation(run.id);
      aiRecommendations = [result.recommendation, ...aiRecommendations.filter((item) => item.id !== result.recommendation.id)];
      aiStatus = `AI selesai (${result.recommendation.status})`;
    } catch (err) { aiStatus = err instanceof Error ? err.message : 'Rekomendasi AI tidak dapat dibuat'; }
    finally { aiPreparing = false; }
  }

  function downloadCsv() {
    const rows = filteredResults.map((item) => [item.externalId, item.title, item.query, item.sortMode, item.rank, item.assetType, item.width ? `${item.width}x${item.height}` : '', item.assetUrl]);
    const csv = [['external_id', 'title', 'query', 'sort_mode', 'rank', 'asset_type', 'dimensions', 'asset_url'], ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `stockscope-${run?.seedKeyword ?? 'research'}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  onMount(() => {
    void loadData();
    connectResearchStream();
    return () => {
      streamController?.abort();
      if (streamRetryTimer) clearTimeout(streamRetryTimer);
    };
  });
</script>

<svelte:head><title>{run ? `${researchLabel} — StockScope` : 'Research — StockScope'}</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-5">
  <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
    <div><a href="/" class="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200"><ArrowLeft size={14} /> Back to overview</a><div class="flex items-center gap-2"><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Research run</p>{#if run}<Badge tone={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : run.status === 'running' ? 'default' : 'warning'}>{run.status}</Badge>{/if}</div><h1 class="mt-2 text-2xl font-semibold tracking-tight">{run ? researchLabel : 'Loading research…'}</h1><p class="mt-1 text-sm text-slate-500">{run?.mode === 'primary' ? 'Adobe Stock Page One' : run?.assetType ?? 'Adobe Stock'} · {run?.locale ?? ''} · started {formatDate(run?.createdAt)}</p></div>
    <div class="flex flex-wrap gap-2">{#if run && ['pending', 'running'].includes(run.status)}<Button variant="destructive" size="sm" on:click={cancel}><Ban size={14} /> Cancel</Button>{:else if run && isTerminal}<Button size="sm" on:click={rerunResearch} disabled={rerunning}><RefreshCw size={14} class={rerunning ? 'animate-spin' : ''} /> {rerunning ? 'Membuat…' : 'Riset ulang'}</Button><Button variant="ghost" size="sm" on:click={deleteRun}><Trash2 size={14} /> Delete</Button>{/if}<Button variant="outline" size="sm" on:click={() => loadData(true)} disabled={refreshing}><RefreshCw size={14} class={refreshing ? 'animate-spin' : ''} /> Refresh</Button></div>
  </div>

  {#if error}<div class="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><X size={15} />{error}</div>{/if}
  {#if summary?.dataAge.refreshRecommended}<div class="flex flex-col justify-between gap-3 rounded-md border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100 sm:flex-row sm:items-center"><div><p class="font-medium">Data ini sudah {summary.dataAge.dataAgeDays ?? 0} hari.</p><p class="mt-1 text-xs text-amber-200/70">Ranking Adobe berubah. Jalankan ulang untuk snapshot terbaru.</p></div><Button variant="outline" size="sm" on:click={rerunResearch} disabled={rerunning}><RefreshCw size={14} /> Riset ulang</Button></div>{/if}

  {#if loading}<Card className="p-10 text-center text-sm text-slate-500"><LoaderCircle size={16} class="mr-2 inline animate-spin" /> Loading research…</Card>
  {:else if run}
    <Card className="p-4 sm:p-5"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p class="text-xs text-slate-500">Collection progress</p><p class="mt-1 font-mono text-sm text-slate-200">{run.progressCompleted} / {run.progressTotal || '—'} queries processed</p></div><div class="flex items-center gap-2 text-xs text-slate-500">{#if run.status === 'running'}<LoaderCircle size={14} class="animate-spin text-cyan-400" /> Worker is collecting{:else if run.status === 'completed'}<Check size={14} class="text-emerald-400" /> Collection complete{:else}<span class="capitalize">{run.status}</span>{/if}</div></div><div class="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full bg-cyan-400 transition-all" style={`width:${run.status === 'completed' ? 100 : progress}%`}></div></div>{#if run.errorMessage}<p class="mt-3 text-xs text-red-300">{run.errorMessage}</p>{/if}</Card>

    <div class="grid gap-3 sm:grid-cols-4"><Card className="p-4"><p class="text-xs text-slate-500">Suggestions</p><p class="mt-2 text-xl font-semibold">{summary?.totals.suggestions ?? run.maxSuggestions}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Queries</p><p class="mt-2 text-xl font-semibold">{summary?.totals.queries ?? uniqueQueries}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Unique assets</p><p class="mt-2 text-xl font-semibold">{summary?.totals.uniqueAssets ?? uniqueAssets}</p></Card><Card className="p-4"><p class="text-xs text-slate-500">Scored keywords</p><p class="mt-2 text-xl font-semibold text-cyan-300">{summary?.totals.scoredKeywords ?? '—'}</p></Card></div>
    <div class="flex items-center gap-1 border-b border-slate-800"><button class={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${detailTab === 'insights' ? 'border-cyan-400 text-slate-100' : 'border-transparent text-slate-500'}`} on:click={() => detailTab = 'insights'}><BarChart3 size={15} /> Insights</button><button class={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${detailTab === 'overview' ? 'border-cyan-400 text-slate-100' : 'border-transparent text-slate-500'}`} on:click={() => detailTab = 'overview'}><Activity size={15} /> Raw data & activity</button></div>

    {#if detailTab === 'insights' && summary}
      <Card className="p-4 sm:p-5"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Research score</p><h2 class="mt-1 text-sm font-medium">Opportunity snapshot</h2><p class="mt-1 text-xs text-slate-500">Sinyal observasi, bukan jumlah download aktual atau jaminan penjualan.</p></div><div class="sm:text-right"><p class="text-[11px] text-slate-500">Opportunity score</p><p class="font-mono text-2xl font-semibold text-cyan-300">{scoreText(summary.scores.opportunityScore)}<span class="text-sm text-slate-600">/100</span></p></div></div><div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{#each [{ label: 'Demand proxy', value: summary.scores.demandScore, color: 'bg-cyan-400' }, { label: 'Low competition', value: summary.scores.competitionScore, color: 'bg-violet-400' }, { label: 'Freshness', value: summary.scores.freshnessScore, color: 'bg-amber-400' }, { label: 'Cross-sort', value: summary.scores.consistencyScore, color: 'bg-emerald-400' }, { label: 'Query quality', value: summary.dataQuality.queryCoveragePct, color: 'bg-slate-400' }] as metric}<div><p class="text-[11px] text-slate-500">{metric.label}</p><p class="mt-1 font-mono text-sm">{scoreText(metric.value)}</p><div class="mt-2 h-1 rounded bg-slate-800"><div class={`h-full rounded ${metric.color}`} style={`width:${metric.value ?? 0}%`}></div></div></div>{/each}</div><div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-800 pt-3 text-[11px] text-slate-500"><span>Confidence <b class="text-slate-300">{summary.dataQuality.confidence}</b></span><span>Observed <b class="text-slate-300">{formatDate(summary.dataAge.lastObservedAt)}</b></span><span>Formula <b class="font-mono text-slate-300">{summary.scoringVersion}</b></span></div>{#if summary.dataQuality.warnings.length}<div class="mt-3 rounded-md border border-amber-400/15 bg-amber-400/5 p-3 text-[11px] leading-5 text-amber-200/80">{summary.dataQuality.warnings.join(' ')}</div>{/if}</Card>

      {#if summary.topAssets.length}<Card><div class="flex flex-col justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center"><div><h2 class="text-sm font-medium">Asset gallery</h2><p class="mt-0.5 text-xs text-slate-500">Visual utama dengan score dan bukti lintas sort.</p></div><div class="flex gap-2"><div class="relative"><Search size={14} class="absolute left-2.5 top-2.5 text-slate-600" /><input aria-label="Filter assets" bind:value={search} placeholder="Cari asset…" class="h-8 w-40 rounded-md border border-slate-700 bg-slate-950 pl-8 pr-3 text-xs outline-none focus:border-cyan-400" /></div><select aria-label="Filter signal" bind:value={crossSortFilter} class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300"><option value="all">Semua sinyal</option><option value="consensus">Cross-sort</option><option value="downloads">Top downloads</option><option value="fresh">Fresh contender</option></select></div></div>{#if !filteredOpportunityAssets.length}<div class="p-10 text-center text-sm text-slate-500">Tidak ada aset untuk filter ini.</div>{:else}<div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{#each filteredOpportunityAssets as item}<article class="group overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70"><a href={item.assetUrl} target="_blank" rel="noreferrer" class="relative block aspect-[4/3] overflow-hidden bg-slate-900">{#if item.thumbnailUrl}<img src={item.thumbnailUrl} alt={item.title} loading="lazy" class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />{:else}<Image size={28} class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700" />{/if}<span class="absolute right-2 top-2 rounded bg-slate-950/85 px-2 py-1 font-mono text-xs font-semibold text-cyan-200">{scoreText(item.assetScore)}</span></a><div class="space-y-3 p-3"><div><p class="line-clamp-2 min-h-8 text-xs font-medium leading-4 text-slate-200">{item.title || 'Untitled asset'}</p><p class="mt-1 truncate text-[10px] text-slate-600">{item.query} · #{item.externalId}</p></div><div class="flex flex-wrap gap-1">{#if item.crossSortLabel === 'strong_consensus'}<Badge tone="success">3/3 consensus</Badge>{:else if item.crossSortLabel === 'multi_signal'}<Badge tone="default">2/3 signals</Badge>{:else}<Badge tone="muted">{item.sortCoverage}/{item.evaluatedSortCount} observed</Badge>{/if}{#if item.evidence.includes('top_download_signal')}<Badge tone="warning">Top downloads</Badge>{/if}{#if item.evidence.includes('fresh_contender')}<Badge tone="success">Fresh</Badge>{/if}</div><div class="grid grid-cols-3 gap-2 border-t border-slate-800 pt-2 text-center"><div><p class="text-[9px] uppercase text-slate-600">Downloads</p><p class="mt-1 font-mono text-xs">{item.ranks.downloads ?? '—'}</p></div><div><p class="text-[9px] uppercase text-slate-600">Relevance</p><p class="mt-1 font-mono text-xs">{item.ranks.relevance ?? '—'}</p></div><div><p class="text-[9px] uppercase text-slate-600">Recent</p><p class="mt-1 font-mono text-xs">{item.ranks.recent ?? '—'}</p></div></div></div></article>{/each}</div>{/if}</Card>{/if}

      {#if summary.topKeywords.length}<Card><div class="border-b border-slate-800 px-4 py-3"><h2 class="text-sm font-medium">Keyword ranking</h2><p class="mt-0.5 text-xs text-slate-500">Seed dipisahkan dari related tags. Related tag memakai discovery score dari bukti aset, bukan market score.</p></div><div class="overflow-x-auto"><table class="w-full min-w-[900px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3">Rank / keyword</th><th class="px-4 py-3">Level</th><th class="px-4 py-3">Score</th><th class="px-4 py-3">D / R / New</th><th class="px-4 py-3">Competition</th><th class="px-4 py-3">Evidence</th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each summary.topKeywords as item}<tr class="hover:bg-slate-800/30"><td class="px-4 py-3"><div class="flex items-center gap-2"><span class="w-6 font-mono text-slate-600">{item.isSeed ? 'S' : item.rank ?? '—'}</span><div><KeywordLabel keyword={item.keyword} level={item.level} label={item.label} /><p class="mt-0.5 text-[10px] text-slate-600">{item.isSeed ? 'Seed overview' : item.researchStatus === 'directly_researched' ? 'Directly researched' : 'Related tag discovery'}</p></div></div></td><td class="px-4 py-3"><span class="inline-flex items-center gap-2"><span class={`h-2.5 w-2.5 rounded-full ${levelClass(item.level)}`}></span>L{item.level} · {item.label}</span></td><td class="px-4 py-3"><span class="font-mono font-semibold">{scoreText(item.opportunityScore)}</span><div class="mt-1 h-1 w-20 rounded bg-slate-800"><div class={`h-full rounded ${levelClass(item.level)}`} style={`width:${item.opportunityScore ?? 0}%`}></div></div></td><td class="px-4 py-3 font-mono text-slate-400">{item.bestDownloadRank ?? '—'} / {item.bestRelevanceRank ?? '—'} / {item.bestRecentRank ?? '—'}</td><td class="px-4 py-3"><p class="font-mono">{item.resultCount === null ? '—' : compactNumber(item.resultCount)}</p><p class="mt-0.5 text-[10px] text-slate-600">{item.resultCountQualifier}</p></td><td class="px-4 py-3"><Badge tone={item.confidence === 'high' ? 'success' : item.confidence === 'medium' ? 'default' : 'muted'}>{item.confidence}</Badge><p class="mt-1 text-[10px] text-slate-600">{item.supportingAssetCount} supporting assets</p></td></tr>{/each}</tbody></table></div></Card>{/if}

      <Card className="flex flex-col justify-between gap-3 border-cyan-400/15 bg-cyan-400/5 p-4 sm:flex-row sm:items-center"><div><div class="flex items-center gap-2"><Sparkles size={15} class="text-cyan-300" /><h2 class="text-sm font-medium">AI recommendation</h2></div><p class="mt-1 text-xs text-slate-500">AI membaca sinyal observasi, bukan data download aktual.</p>{#if aiStatus}<p class="mt-2 text-xs text-cyan-300">{aiStatus}</p>{/if}</div><Button variant="outline" size="sm" on:click={prepareAi} disabled={aiPreparing || !isTerminal}>{aiPreparing ? 'Generating…' : 'Generate recommendation'}</Button></Card>
      {#if aiPayload}<Card className="space-y-4 border-cyan-400/15 p-4"><div><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Gemini output</p><p class="mt-2 text-xs leading-5 text-slate-400">{aiPayload.summary}</p></div>{#if aiPayload.overallAssessment}<p class="rounded border border-slate-800 p-3 text-xs text-slate-400">{aiPayload.overallAssessment}</p>{/if}<div class="grid gap-3 lg:grid-cols-2">{#each aiPayload.recommendations ?? [] as item}<div class="rounded border border-slate-800 p-4"><div class="flex justify-between gap-2"><h3 class="text-sm font-medium">{item.assetConcept}</h3><Badge tone={item.confidence === 'high' ? 'success' : 'muted'}>{item.confidence ?? '—'}</Badge></div><p class="mt-1 text-xs text-cyan-300">{item.format}</p><p class="mt-3 text-xs leading-5 text-slate-400">{item.rationale}</p><p class="mt-3 text-[11px] text-slate-500">Keywords: {(item.keywordCluster ?? []).join(', ')}</p></div>{/each}</div></Card>{/if}
    {:else}
      <ResearchDetailLogs logs={detailLogs} isLive={!isTerminal} />
      <Card className="border-slate-800 p-4"><div class="flex items-center gap-3"><div class="rounded bg-cyan-400/10 p-2"><Globe size={16} class="text-cyan-300" /></div><div class="flex-1"><p class="text-xs text-slate-500">Scraping connection</p><p class="mt-1 text-sm">{scrapingLocation.connection}{scrapingLocation.location ? ` · ${scrapingLocation.location}` : ''}</p></div><div class="text-right"><p class="text-[11px] text-slate-500">Public IP</p><p class="font-mono text-sm text-cyan-300">{scrapingLocation.ip ?? 'Not available'}</p></div></div>{#if scrapingLocation.isp || scrapingLocation.note}<p class="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-500">{scrapingLocation.isp ?? scrapingLocation.note}</p>{/if}</Card>
      <Card><div class="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><h2 class="text-sm font-medium">Live activity</h2><p class="mt-0.5 text-xs text-slate-500">Event worker terbaru</p></div>{#if !isTerminal}<span class="text-xs text-emerald-400">● Live</span>{/if}</div>{#if !events.length}<div class="p-6 text-xs text-slate-600">Belum ada event.</div>{:else}<div class="max-h-72 divide-y divide-slate-800/60 overflow-y-auto">{#each events as event}<div class="flex gap-3 px-4 py-2.5 text-xs"><span class={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${event.level === 'error' ? 'bg-red-400' : event.level === 'warning' ? 'bg-amber-400' : event.level === 'success' ? 'bg-emerald-400' : 'bg-cyan-400'}`}></span><div><p class={event.level === 'error' ? 'text-red-300' : 'text-slate-300'}>{event.message}</p>{#if eventDetail(event)}<p class="mt-1 break-words font-mono text-[10px] text-slate-500">{eventDetail(event)}</p>{/if}<p class="mt-1 font-mono text-[10px] text-slate-600">{formatDate(event.createdAt)} · {event.eventType}</p></div></div>{/each}</div>{/if}</Card>
      <Card><div class="flex flex-col justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row"><div class="flex gap-1"><button class={`rounded-md px-3 py-1.5 text-xs ${rawTab === 'assets' ? 'bg-slate-800' : 'text-slate-500'}`} on:click={() => rawTab = 'assets'}><Image size={13} class="mr-1 inline" /> Assets</button><button class={`rounded-md px-3 py-1.5 text-xs ${rawTab === 'keywords' ? 'bg-slate-800' : 'text-slate-500'}`} on:click={() => rawTab = 'keywords'}><Tag size={13} class="mr-1 inline" /> Keywords</button></div><div class="flex gap-2"><div class="relative"><Search size={14} class="absolute left-2.5 top-2.5 text-slate-600" /><input bind:value={search} aria-label="Filter raw data" class="h-8 w-44 rounded-md border border-slate-700 bg-slate-950 pl-8 pr-2 text-xs" placeholder="Filter…" /></div>{#if rawTab === 'assets'}<select bind:value={sortFilter} aria-label="Sort mode" class="h-8 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs"><option value="all">All sorts</option><option value="downloads">Downloads</option><option value="relevance">Relevance</option><option value="recent">Recent</option></select><Button size="sm" variant="outline" on:click={downloadCsv}><Download size={13} /> CSV</Button>{/if}</div></div>{#if rawTab === 'assets'}<div class="overflow-x-auto"><table class="w-full min-w-[760px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase text-slate-600"><tr><th class="px-4 py-3">Asset</th><th class="px-4 py-3">Query</th><th class="px-4 py-3">Sort</th><th class="px-4 py-3">Rank</th><th></th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each filteredResults as item}<tr><td class="max-w-[360px] px-4 py-3"><div class="flex items-center gap-3"><div class="h-10 w-14 overflow-hidden rounded-md bg-slate-800">{#if item.thumbnailUrl}<img src={item.thumbnailUrl} alt="" class="h-full w-full object-cover" />{/if}</div><p class="truncate">{item.title || 'Untitled asset'}</p></div></td><td class="px-4 py-3 text-slate-400">{item.query}</td><td class="px-4 py-3"><Badge tone="muted">{item.sortMode}</Badge></td><td class="px-4 py-3 font-mono">{item.rank}</td><td class="px-4 py-3"><a href={item.assetUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a></td></tr>{/each}</tbody></table></div>{:else}<div class="overflow-x-auto"><table class="w-full min-w-[620px] text-left text-xs"><thead class="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-600"><tr><th class="px-4 py-3">Keyword</th><th class="px-4 py-3">Asset</th><th class="px-4 py-3">Position</th><th class="px-4 py-3">Source</th></tr></thead><tbody class="divide-y divide-slate-800/70">{#each filteredKeywords as item}<tr><td class="px-4 py-3 text-cyan-300">{item.keyword}</td><td class="max-w-[380px] truncate px-4 py-3 text-slate-400">{item.title}</td><td class="px-4 py-3 font-mono">{item.position}</td><td class="px-4 py-3"><Badge tone="muted">{item.source}</Badge></td></tr>{/each}</tbody></table></div>{/if}</Card>
    {/if}
  {:else}<Card className="p-8 text-center text-sm text-slate-500">Research tidak ditemukan.</Card>{/if}
</div>
