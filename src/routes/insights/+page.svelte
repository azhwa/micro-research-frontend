<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUpRight, BarChart3, Download, Image, RefreshCw, SlidersHorizontal, Sparkles, TrendingDown, TrendingUp } from '@lucide/svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import KeywordLabel from '$lib/components/KeywordLabel.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import type { AiRecommendation, AssetReadoutItem, GlobalInsights, KeywordReadoutItem } from '$lib/types';
  import { compactNumber, formatDate } from '$lib/utils';

  type ReadoutPayload = { summary?: string; overallAssessment?: string; recommendations?: AssetReadoutItem[]; keywords?: KeywordReadoutItem[]; cautions?: string[] };
  let data: GlobalInsights | null = null;
  let assetType = 'all';
  let locale = 'all';
  let category = 'all';
  let loading = true;
  let error = '';
  let readoutType: 'asset' | 'keyword' = 'asset';
  let aiLoading = false;
  let aiStatus = '';
  let assetReadouts: AiRecommendation[] = [];
  let keywordReadouts: AiRecommendation[] = [];
  let queuedKeywords = new Set<string>();
  let selectedKeywords = new Set<string>();
  let queueingKeyword = '';

  $: latestAsset = assetReadouts.find((item) => item.status === 'completed') ?? assetReadouts[0] ?? null;
  $: latestKeyword = keywordReadouts.find((item) => item.status === 'completed') ?? keywordReadouts[0] ?? null;
  $: assetPayload = latestAsset?.response && typeof latestAsset.response === 'object' && !Array.isArray(latestAsset.response) ? latestAsset.response as ReadoutPayload : null;
  $: keywordPayload = latestKeyword?.response && typeof latestKeyword.response === 'object' && !Array.isArray(latestKeyword.response) ? latestKeyword.response as ReadoutPayload : null;

  async function load() {
    loading = true;
    error = '';
    selectedKeywords = new Set();
    try {
      [data, assetReadouts, keywordReadouts] = await Promise.all([
        api.getGlobalInsights({ assetType, locale, category, limit: 100 }),
        api.getAiReadouts('asset', { assetType, locale, category }),
        api.getAiReadouts('keyword', { assetType, locale, category })
      ]);
      queuedKeywords = new Set((await api.listPromptQueue(200)).map((item) => item.keyword.toLowerCase()));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Global insight tidak dapat dimuat';
    } finally {
      loading = false;
    }
  }

  async function generateReadout() {
    aiLoading = true;
    aiStatus = '';
    try {
      const result = await api.generateAiReadout(readoutType, { assetType, locale, category });
      if (readoutType === 'asset') assetReadouts = [result.recommendation, ...assetReadouts.filter((item) => item.id !== result.recommendation.id)];
      else keywordReadouts = [result.recommendation, ...keywordReadouts.filter((item) => item.id !== result.recommendation.id)];
      aiStatus = `${readoutType === 'asset' ? 'Asset' : 'Keyword'} readout selesai`;
    } catch (err) {
      aiStatus = err instanceof Error ? err.message : 'AI readout gagal';
    } finally {
      aiLoading = false;
    }
  }

  function queueInput(item: KeywordReadoutItem) {
    return {
      keyword: item.keyword,
      category: category === 'all' ? 'general' : category,
      researchAssetType: assetType === 'videos' ? 'videos' as const : 'images' as const,
      promptOutputType: assetType === 'videos' ? 'video' as const : 'image' as const,
      locale: locale === 'all' ? 'en-GB' : locale,
      promptCount: 5,
      recommendedStyle: item.recommendedStyle,
      styleRationale: item.styleRationale,
      sourceReadoutId: latestKeyword?.id,
      sourceScore: item.opportunityScore,
      sourceLevel: item.level,
      sourceConfidence: (item.confidence === 'low' || item.confidence === 'medium' || item.confidence === 'high' ? item.confidence : 'low') as 'low' | 'medium' | 'high',
      sourceEvidence: item.evidenceKeywords ?? [],
      sourceObservedAt: item.lastObservedAt
    };
  }

  async function queueKeyword(item: KeywordReadoutItem) {
    queueingKeyword = item.keyword;
    try {
      const result = await api.queuePrompts([queueInput(item)]);
      queuedKeywords = new Set([...queuedKeywords, ...result.created.map((entry) => entry.keyword.toLowerCase()), ...result.duplicate.map((entry) => entry.toLowerCase())]);
      aiStatus = result.created.length ? `Keyword “${item.keyword}” masuk Prompt Queue` : `Keyword “${item.keyword}” sudah ada di Prompt Queue`;
    } catch (err) {
      aiStatus = err instanceof Error ? err.message : 'Keyword tidak dapat masuk Prompt Queue';
    } finally {
      queueingKeyword = '';
    }
  }

  async function queueSelected(items: KeywordReadoutItem[]) {
    const selected = items.filter((item) => selectedKeywords.has(item.keyword) && !queuedKeywords.has(item.keyword.toLowerCase())).slice(0, 20);
    if (!selected.length) return;
    queueingKeyword = '__bulk__';
    try {
      const result = await api.queuePrompts(selected.map(queueInput));
      queuedKeywords = new Set([...queuedKeywords, ...result.created.map((entry) => entry.keyword.toLowerCase()), ...result.duplicate.map((entry) => entry.toLowerCase())]);
      selectedKeywords = new Set();
      aiStatus = `${result.created.length} keyword masuk Prompt Queue · ${result.duplicate.length} duplikat · ${result.rejected.length} ditolak`;
    } catch (err) {
      aiStatus = err instanceof Error ? err.message : 'Keyword tidak dapat masuk Prompt Queue';
    } finally {
      queueingKeyword = '';
    }
  }

  async function researchKeyword(item: KeywordReadoutItem) {
    queueingKeyword = `research:${item.keyword}`;
    try {
      await api.queueResearch({ keyword: item.keyword, category: category === 'all' ? 'general' : category, assetType: assetType === 'videos' ? 'videos' : 'images', locale: locale === 'all' ? 'en-GB' : locale });
      aiStatus = `Research keyword “${item.keyword}” masuk Research Queue`;
    } catch (err) {
      aiStatus = err instanceof Error ? err.message : 'Keyword tidak dapat masuk Research Queue';
    } finally {
      queueingKeyword = '';
    }
  }

  function toggleKeyword(keyword: string) {
    const next = new Set(selectedKeywords);
    if (next.has(keyword)) next.delete(keyword);
    else if (next.size < 20) next.add(keyword);
    selectedKeywords = next;
  }

  const confidenceTone = (value: string) => value === 'high' ? 'success' : value === 'medium' ? 'default' : 'muted';
  const readoutMeta = (item: AiRecommendation | null) => item ? `${item.model ?? 'AI'} · ${formatDate(item.createdAt)}` : 'Belum dibuat';
  onMount(load);
</script>

<svelte:head><title>Global insight | StockScope</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-7">
  <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="eyebrow">Cross-research intelligence</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Global insight</h1><p class="mt-2 text-sm text-muted-foreground">Sinyal yang berulang menjadi arah research dan prompt berikutnya.</p></div><div class="flex flex-wrap gap-2"><a href="/research/new"><Button size="sm">New research <ArrowUpRight size={14} /></Button></a><a href="/discover"><Button variant="outline" size="sm">Discover ideas <ArrowUpRight size={14} /></Button></a></div></section>

  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div class="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><SlidersHorizontal size={14} /> Scope</div><select aria-label="Filter asset type" bind:value={assetType} on:change={load} class="h-9 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value="all">All asset types</option><option value="images">Images</option><option value="videos">Videos</option></select><select aria-label="Filter locale" bind:value={locale} on:change={load} class="h-9 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value="all">All locales</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select><select aria-label="Filter category" bind:value={category} on:change={load} class="h-9 rounded-md border border-border bg-card px-2 text-xs text-card-foreground"><option value="all">All categories</option>{#each ['business','technology','wellness','sustainability','finance','lifestyle','travel','food','general'] as item}<option value={item}>{item}</option>{/each}</select><Button variant="ghost" size="icon" ariaLabel="Refresh insights" on:click={load}><RefreshCw size={15} class={loading ? 'animate-spin' : ''} /></Button><a class="sm:ml-auto" href={api.getGlobalExportUrl({ assetType, locale, category })}><Button variant="outline" size="sm"><Download size={14} /> CSV</Button></a></Card>
  {#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}
  {#if loading}<Card className="p-12 text-center text-sm text-muted-foreground">Loading global insight...</Card>{:else if data}
    <div class="grid gap-3 sm:grid-cols-4"><Card className="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research runs</p><p class="mt-2 text-3xl font-bold">{data.totals.researchRuns}</p></Card><Card className="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keywords</p><p class="mt-2 text-3xl font-bold">{data.totals.keywords}</p></Card><Card className="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assets</p><p class="mt-2 text-3xl font-bold">{data.totals.assets}</p></Card><Card className="p-5"><p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Snapshots</p><p class="mt-2 text-3xl font-bold">{data.totals.snapshots}</p></Card></div>
    {#if aiStatus}<div class="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm text-primary" role="status">{aiStatus}</div>{/if}

    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p class="eyebrow">AI readout</p><h2 class="mt-1 text-lg font-bold">Evidence to next action</h2><p class="mt-1 text-[11px] text-muted-foreground">{readoutType === 'asset' ? readoutMeta(latestAsset) : readoutMeta(latestKeyword)} · {assetType}/{locale}/{category}</p></div><div class="flex items-center gap-2"><div class="inline-flex rounded-md border border-border p-0.5"><button class={`rounded-sm px-3 py-1.5 text-xs font-semibold ${readoutType === 'asset' ? 'bg-active/15 text-active' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => readoutType = 'asset'}>Assets</button><button class={`rounded-sm px-3 py-1.5 text-xs font-semibold ${readoutType === 'keyword' ? 'bg-active/15 text-active' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => readoutType = 'keyword'}>Keywords</button></div><Button size="sm" on:click={generateReadout} disabled={aiLoading || (!data.keywords.length && !data.assets.length)}><Sparkles size={14} /> {aiLoading ? 'Reading...' : 'Generate'}</Button></div></div>

    {#if readoutType === 'asset'}
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><Card><div class="border-b border-border px-5 py-4"><p class="eyebrow">Asset evidence</p><h2 class="mt-1 text-base font-bold">Global asset ranking</h2><p class="mt-1 text-xs text-muted-foreground">Aset yang muncul berulang setelah deduplikasi snapshot.</p></div><div class="grid gap-4 p-5 sm:grid-cols-2">{#each data.assets.slice(0, 8) as item}<a href={item.assetUrl} target="_blank" rel="noreferrer" class="group overflow-hidden rounded-lg border border-border bg-card"><div class="relative aspect-[4/3] overflow-hidden bg-muted">{#if item.thumbnailUrl}<img src={item.thumbnailUrl} alt={item.title} loading="lazy" class="h-full w-full object-cover transition group-hover:scale-[1.03]" />{:else}<Image size={28} class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />{/if}<span class="absolute right-2 top-2 rounded bg-neutral/90 px-2 py-1 font-mono text-xs text-neutral-content">{item.weightedScore ?? '--'}</span></div><div class="p-3"><p class="line-clamp-2 min-h-8 text-xs font-semibold">{item.title || 'Untitled asset'}</p><div class="mt-2 flex items-center justify-between"><Badge tone={confidenceTone(item.confidence)}>{item.confidence}</Badge><span class="text-[10px] text-muted-foreground">{item.researchCount} research</span></div><p class="mt-2 font-mono text-[10px] text-muted-foreground">D {item.bestDownloadRank ?? '--'} · R {item.bestRelevanceRank ?? '--'} · New {item.bestRecentRank ?? '--'}</p></div></a>{/each}</div></Card><Card className="p-5"><div class="flex items-center justify-between gap-3"><div><p class="eyebrow">AI asset readout</p><h2 class="mt-1 text-base font-bold">What to make next</h2></div><div class="flex gap-1"><Button size="icon" variant="ghost" ariaLabel="Export asset readout CSV" on:click={() => api.downloadAiReadoutExport('asset', 'csv', { assetType, locale, category })}><Download size={14} /></Button><Button size="icon" variant="ghost" ariaLabel="Export asset readout TXT" on:click={() => api.downloadAiReadoutExport('asset', 'txt', { assetType, locale, category })}><span class="text-[10px] font-bold">TXT</span></Button></div></div>{#if assetPayload}<p class="mt-4 text-xs leading-5 text-muted-foreground">{assetPayload.summary}</p>{#if assetPayload.overallAssessment}<p class="mt-3 rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">{assetPayload.overallAssessment}</p>{/if}<div class="mt-4 space-y-3">{#each (assetPayload.recommendations ?? []).slice(0, 6) as item}<article class="border-b border-border/60 pb-3 last:border-0"><div class="flex items-start justify-between gap-2"><h3 class="text-sm font-bold">{item.assetConcept}</h3><Badge tone={confidenceTone(item.confidence ?? 'low')}>{item.confidence ?? '--'}</Badge></div><p class="mt-1 text-xs text-primary">{item.format}</p><p class="mt-2 text-xs leading-5 text-muted-foreground">{item.rationale}</p><p class="mt-2 text-[11px] text-muted-foreground">{(item.keywordCluster ?? []).join(' · ')}</p></article>{/each}</div>{:else}<div class="mt-6 rounded-md bg-muted/50 p-4 text-xs leading-5 text-muted-foreground">Generate Asset Readout untuk mendapatkan ringkasan konsep dari asset evidence.</div>{/if}</Card></div>
    {:else}
      <Card><div class="border-b border-border px-5 py-4"><p class="eyebrow">Keyword opportunities</p><h2 class="mt-1 text-base font-bold">Keywords to action</h2><p class="mt-1 text-xs text-muted-foreground">Research keyword dan Prompt Queue adalah dua aksi berbeda.</p></div>{#if keywordPayload}<div class="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3"><p class="text-xs leading-5 text-muted-foreground">{keywordPayload.summary}</p><div class="flex shrink-0 gap-1"><Button size="sm" variant="outline" on:click={() => queueSelected(keywordPayload?.keywords ?? [])} disabled={!selectedKeywords.size || queueingKeyword === '__bulk__'}>Add selected ({selectedKeywords.size})</Button><Button size="sm" variant="outline" on:click={() => api.downloadAiReadoutExport('keyword', 'csv', { assetType, locale, category })}><Download size={13} /> CSV</Button><Button size="sm" variant="ghost" on:click={() => api.downloadAiReadoutExport('keyword', 'txt', { assetType, locale, category })}>TXT</Button></div></div><div class="overflow-x-auto"><table class="w-full min-w-[1,050px] text-left text-xs"><thead class="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th class="w-10 px-5 py-3"><span class="sr-only">Select</span></th><th class="px-5 py-3">Keyword</th><th class="px-5 py-3">Score</th><th class="px-5 py-3">Suggested style</th><th class="px-5 py-3">Evidence</th><th class="px-5 py-3">Actions</th></tr></thead><tbody class="divide-y divide-border/60">{#each keywordPayload.keywords ?? [] as item}<tr class="hover:bg-muted/50"><td class="px-5 py-3"><input type="checkbox" aria-label={`Select ${item.keyword}`} checked={selectedKeywords.has(item.keyword)} disabled={queuedKeywords.has(item.keyword.toLowerCase())} on:change={() => toggleKeyword(item.keyword)} /></td><td class="px-5 py-3"><p class="font-semibold">{item.keyword}</p><p class="mt-1 text-[10px] text-muted-foreground">L{item.level ?? 0} · {item.label ?? 'insufficient evidence'} · {item.confidence}</p></td><td class="px-5 py-3"><span class="font-mono font-bold text-primary">{item.opportunityScore}</span><p class="mt-1 text-[10px] text-muted-foreground">{item.researchCount ?? 0} research · {item.assetCount ?? 0} assets</p></td><td class="max-w-[220px] px-5 py-3"><p class="font-medium">{item.recommendedStyle}</p><p class="mt-1 text-[11px] text-muted-foreground">{item.styleRationale}</p></td><td class="max-w-[260px] px-5 py-3 text-muted-foreground">{item.whyItMatters}<p class="mt-1 text-[10px]">{(item.evidenceKeywords ?? []).join(' · ')}</p></td><td class="px-5 py-3"><div class="flex flex-wrap gap-2"><Button size="sm" variant={queuedKeywords.has(item.keyword.toLowerCase()) ? 'default' : 'outline'} disabled={queuedKeywords.has(item.keyword.toLowerCase()) || queueingKeyword === item.keyword} on:click={() => queueKeyword(item)}>{queuedKeywords.has(item.keyword.toLowerCase()) ? 'Prompt queued' : queueingKeyword === item.keyword ? 'Adding...' : 'Add prompt'}</Button><Button size="sm" variant="ghost" disabled={queueingKeyword === `research:${item.keyword}`} on:click={() => researchKeyword(item)}>{queueingKeyword === `research:${item.keyword}` ? 'Adding...' : 'Research'}</Button></div></td></tr>{/each}</tbody></table></div>{:else}<div class="p-8 text-center text-sm text-muted-foreground">Generate Keyword Readout untuk mendapatkan keyword + style yang siap ditindaklanjuti.</div>{/if}</Card>
    {/if}

    {#if data.keywords.length}<Card><div class="border-b border-border px-5 py-4"><p class="eyebrow">Global keyword scoring</p><h2 class="mt-1 text-base font-bold">Observed ranking</h2></div><div class="overflow-x-auto"><table class="w-full min-w-[900px] text-left text-xs"><thead class="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th class="px-5 py-3">Keyword</th><th class="px-5 py-3">Score</th><th class="px-5 py-3">Confidence</th><th class="px-5 py-3">Researches</th><th class="px-5 py-3">Avg rank</th><th class="px-5 py-3">Avg results</th><th class="px-5 py-3">Trend</th><th class="px-5 py-3">Observed</th></tr></thead><tbody class="divide-y divide-border/60">{#each data.keywords as item}<tr class="hover:bg-muted/50"><td class="px-5 py-3"><KeywordLabel keyword={item.keyword} level={item.level} label={item.label} /><p class="mt-1 text-[10px] text-muted-foreground">{item.assetTypes.join(', ')} · {item.categories.join(', ')}</p></td><td class="px-5 py-3"><span class="font-mono font-bold">{item.globalOpportunityScore ?? '--'}</span><div class="mt-1 h-1 w-20 rounded bg-muted"><div class="h-full rounded bg-primary" style={`width:${item.globalOpportunityScore ?? 0}%`}></div></div></td><td class="px-5 py-3"><Badge tone={confidenceTone(item.confidence)}>{item.confidence}</Badge></td><td class="px-5 py-3 font-mono">{item.researchCount}</td><td class="px-5 py-3 font-mono text-muted-foreground">{item.averageDownloadRank ?? '--'}</td><td class="px-5 py-3 font-mono text-muted-foreground">{item.averageResultCount === null ? '--' : compactNumber(item.averageResultCount)}</td><td class="px-5 py-3">{#if item.trend === 'up'}<span class="inline-flex items-center gap-1 text-success"><TrendingUp size={14} /> up</span>{:else if item.trend === 'down'}<span class="inline-flex items-center gap-1 text-error"><TrendingDown size={14} /> down</span>{:else}<span class="text-muted-foreground">{item.trend}</span>{/if}</td><td class="px-5 py-3 text-[10px] text-muted-foreground">{formatDate(item.lastObservedAt)}</td></tr>{/each}</tbody></table></div></Card>{/if}
  {/if}
</div>
