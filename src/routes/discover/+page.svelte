<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { ArrowRight, Check, Clipboard, Compass, Lightbulb, LoaderCircle, X } from '@lucide/svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { api } from '$lib/api';
  import { seedPacks } from '$lib/seed-library';
  import type { AssetType, ResearchMode, ResearchRun, ResearchQueueItem, SeedDiscoveryJob } from '$lib/types';

  let topic = '';
  let category = 'business';
  let assetType: AssetType = 'images';
  let locale = 'en-GB';
  let count = 10;
  let discovery: SeedDiscoveryJob | null = null;
  let previousJobs: SeedDiscoveryJob[] = [];
  let recentRuns: ResearchRun[] = [];
  let queueItems: ResearchQueueItem[] = [];
  let loading = false;
  let loadingHistory = true;
  let error = '';
  let copiedSeed = '';
  let queueLoadingSeed = '';
  let directResearchSeed = '';
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  $: pack = seedPacks.find((item) => item.id === category) ?? seedPacks[0];
  $: isActive = discovery && ['pending', 'running'].includes(discovery.status);
  $: researched = new Set(recentRuns.map((run) => run.seedKeyword.toLowerCase()));
  $: queuedSeeds = new Set(queueItems.filter((item) => item.status === 'queued').map((item) => item.seedKeyword.toLowerCase()));

  function startPolling(id: string) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        discovery = await api.getSeedDiscoveryJob(id);
        if (!['pending', 'running'].includes(discovery.status) && pollTimer) { clearInterval(pollTimer); pollTimer = undefined; }
      } catch (err) { error = err instanceof Error ? err.message : 'Status discovery tidak dapat dimuat'; }
    }, 3000);
  }

  async function discoverSeeds() {
    loading = true; error = '';
    try { discovery = await api.createSeedDiscovery({ topic: topic.trim() || undefined, category, assetType, locale, count }); startPolling(discovery.id); }
    catch (err) { error = err instanceof Error ? err.message : 'Seed discovery gagal dibuat'; }
    finally { loading = false; }
  }

  async function cancelDiscovery() {
    if (!discovery) return;
    try { discovery = await api.cancelSeedDiscoveryJob(discovery.id); if (pollTimer) clearInterval(pollTimer); pollTimer = undefined; }
    catch (err) { error = err instanceof Error ? err.message : 'Discovery tidak dapat dibatalkan'; }
  }

  async function queueSeed(seed: string) {
    queueLoadingSeed = seed; error = '';
    try { await api.queueResearch({ keyword: seed, category, assetType, locale }); queueItems = await api.listResearchQueue(); }
    catch (err) { error = err instanceof Error ? err.message : 'Seed tidak dapat dimasukkan ke research queue'; }
    finally { queueLoadingSeed = ''; }
  }

  async function beginResearch(seed: string) {
    directResearchSeed = seed; error = '';
    try {
      const run = await api.createRun({ keyword: seed, category, assetType, locale, maxSuggestions: 1, assetsPerQuery: 100, autocompleteEnabled: false, mode: 'full' });
      window.location.href = `/research/${run.id}`;
    } catch (err) { error = err instanceof Error ? err.message : 'Research gagal dibuat'; }
    finally { directResearchSeed = ''; }
  }

  async function copySeed(seed: string) {
    try { await navigator.clipboard.writeText(seed); copiedSeed = seed; setTimeout(() => { copiedSeed = ''; }, 1400); }
    catch { error = 'Seed tidak dapat disalin'; }
  }

  async function loadData() {
    loadingHistory = true;
    try { [previousJobs, recentRuns, queueItems] = await Promise.all([api.listSeedDiscoveryJobs(8), api.listRuns(50), api.listResearchQueue()]); }
    catch { /* History is optional; the discovery form remains usable. */ }
    finally { loadingHistory = false; }
  }

  onMount(loadData);
  onDestroy(() => { if (pollTimer) clearInterval(pollTimer); });
</script>

<svelte:head><title>Discover ideas | StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div class="min-w-0"><p class="eyebrow">Research discovery</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Find a seed worth researching.</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Discover Ideas hanya menyusun kandidat research. Prompt dibuat terpisah di Prompt Studio dari keyword yang sudah punya evidence.</p></div>
    <a class="w-full shrink-0 sm:w-auto" href="/research/new"><Button className="w-full whitespace-nowrap sm:w-auto" variant="outline" size="sm">Manual research <ArrowRight size={14} /></Button></a>
  </section>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
    <Card className="p-5 sm:p-6">
      <div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Compass size={18} /></div><div><p class="text-xs font-bold uppercase tracking-wider text-primary">Seed discovery</p><h2 class="mt-1 text-lg font-bold">Find research directions</h2><p class="mt-1 text-xs leading-5 text-muted-foreground">AI memakai global scoring untuk menyusun kandidat, lalu Anda memilih seed yang perlu divalidasi Adobe.</p></div></div>
      <form class="mt-6 space-y-5" on:submit|preventDefault={discoverSeeds}>
        <div class="space-y-2"><label for="discover-topic" class="text-sm font-semibold">Topic (optional)</label><Input id="discover-topic" bind:value={topic} placeholder="e.g. remote work, sustainable travel" /></div>
        <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><label for="discover-category" class="text-sm font-semibold">Category</label><select id="discover-category" bind:value={category} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary">{#each seedPacks as item}<option value={item.id}>{item.label}</option>{/each}</select></div><div class="space-y-2"><label for="discover-locale" class="text-sm font-semibold">Adobe locale</label><select id="discover-locale" bind:value={locale} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select></div></div>
        <div class="space-y-2"><p class="text-sm font-semibold">Research format</p><div class="grid grid-cols-2 gap-2"><button type="button" class={`flex min-h-11 items-center justify-center rounded-md border text-xs font-semibold ${assetType === 'images' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'images'}>Images</button><button type="button" class={`flex min-h-11 items-center justify-center rounded-md border text-xs font-semibold ${assetType === 'videos' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'videos'}>Videos</button></div></div>
        <div class="space-y-2"><label for="discover-count" class="text-sm font-semibold">Candidate count</label><select id="discover-count" bind:value={count} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value={5}>5 focused seeds</option><option value={10}>10 balanced seeds</option><option value={20}>20 broad seeds</option></select></div>
        {#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}
        <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-muted-foreground">Discover tidak membuat prompt dan tidak menjalankan research otomatis.</p><Button type="submit" disabled={loading}>{#if loading}<LoaderCircle size={15} class="animate-spin" /> Finding...{:else}<Compass size={15} /> Find seed ideas{/if}</Button></div>
      </form>
    </Card>

    <Card className="p-5"><div class="flex items-center gap-2"><Lightbulb size={16} class="text-primary" /><h2 class="text-sm font-bold">Research flow</h2></div><ol class="mt-4 space-y-4 text-xs leading-5 text-muted-foreground"><li class="flex gap-3"><span class="font-mono text-primary">01</span><span>AI menyusun seed dari global keyword evidence.</span></li><li class="flex gap-3"><span class="font-mono text-primary">02</span><span>Masukkan seed ke Research Queue atau jalankan sekarang.</span></li><li class="flex gap-3"><span class="font-mono text-primary">03</span><span>Setelah research selesai, gunakan AI Readout untuk memilih keyword dan style prompt.</span></li></ol></Card>
  </div>

  {#if discovery}
    <Card className="p-5 sm:p-6"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div class="flex items-center gap-2"><h2 class="text-base font-bold">{discovery.topic || pack.label}</h2><Badge tone={discovery.status === 'completed' ? 'success' : discovery.status === 'failed' ? 'danger' : discovery.status === 'cancelled' ? 'muted' : 'warning'}>{discovery.status}</Badge></div><p class="mt-1 text-xs text-muted-foreground">{discovery.summary || 'Menganalisis global insights...'}</p></div>{#if isActive}<Button variant="ghost" size="sm" on:click={cancelDiscovery}><X size={14} /> Cancel</Button>{/if}</div>
      {#if isActive}<div class="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary transition-all" style={`width:${Math.max(8, Math.min(100, (discovery.progressCompleted / Math.max(discovery.progressTotal, 1)) * 100))}%`}></div></div>{/if}
      {#if discovery.errorMessage}<div class="mt-4 rounded-md border border-error/25 bg-error/10 p-3 text-sm text-error">{discovery.errorMessage}</div>{/if}
      {#if discovery.candidates.length}<div class="mt-5 grid gap-3 sm:grid-cols-2">{#each discovery.candidates as candidate}<article class={`rounded-lg border p-4 ${queuedSeeds.has(candidate.keyword.toLowerCase()) ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-bold">{candidate.keyword}</p><p class="mt-1 text-[11px] text-muted-foreground">{candidate.source.replace('_', ' ')} · {candidate.confidence} confidence</p></div><span class="font-mono text-sm font-bold text-primary">{candidate.opportunityScore ?? '--'}</span></div><p class="mt-3 text-xs leading-5 text-muted-foreground">{candidate.rationale}</p><div class="mt-4 flex flex-wrap gap-2"><Button size="sm" variant={queuedSeeds.has(candidate.keyword.toLowerCase()) ? 'default' : 'outline'} disabled={queueLoadingSeed === candidate.keyword || queuedSeeds.has(candidate.keyword.toLowerCase())} on:click={() => queueSeed(candidate.keyword)}>{#if queuedSeeds.has(candidate.keyword.toLowerCase())}<Check size={13} /> Queued{:else}Queue research{/if}</Button><Button size="sm" variant="ghost" on:click={() => copySeed(candidate.keyword)}><Clipboard size={13} /> {copiedSeed === candidate.keyword ? 'Copied' : 'Copy seed'}</Button><Button size="sm" variant="ghost" disabled={directResearchSeed === candidate.keyword} on:click={() => beginResearch(candidate.keyword)}>{directResearchSeed === candidate.keyword ? 'Starting...' : 'Research now'} <ArrowRight size={13} /></Button></div></article>{/each}</div>{/if}
      {#if queuedSeeds.size}<div class="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs text-muted-foreground"><span class="font-bold text-foreground">{queuedSeeds.size}</span> seed tersimpan di Research Queue</p><a href="/research-queue"><Button variant="outline">Open research queue <ArrowRight size={14} /></Button></a></div>{/if}
    </Card>
  {/if}

  <div class="grid gap-6 lg:grid-cols-2"><Card className="p-5"><p class="eyebrow">Manual ideas</p><h2 class="mt-1 text-sm font-bold">{pack.label}</h2><p class="mt-2 text-xs leading-5 text-muted-foreground">Starter seed untuk memulai Adobe research saat global context masih tipis.</p><div class="mt-4 space-y-1.5">{#each pack.seeds.slice(0, 6) as seed}<button type="button" on:click={() => beginResearch(seed)} class="flex min-h-10 w-full items-center justify-between rounded-md border border-border px-3 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><span>{seed}</span>{#if researched.has(seed.toLowerCase())}<span class="text-[10px] text-success">researched</span>{/if}</button>{/each}</div></Card><Card className="p-5"><p class="eyebrow">Recent discovery</p>{#if loadingHistory}<p class="mt-3 text-xs text-muted-foreground">Loading history...</p>{:else if !previousJobs.length}<p class="mt-3 text-xs text-muted-foreground">Belum ada sesi discovery.</p>{:else}<div class="mt-3 space-y-3">{#each previousJobs.slice(0, 5) as job}<button type="button" class="w-full text-left" on:click={() => { discovery = job; if (['pending', 'running'].includes(job.status)) startPolling(job.id); }}><div class="flex items-center justify-between gap-2"><span class="truncate text-xs font-semibold">{job.topic || job.category}</span><Badge tone={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : 'muted'}>{job.status}</Badge></div><p class="mt-1 text-[11px] text-muted-foreground">{job.candidates.length} candidates · {new Date(job.createdAt).toLocaleDateString('id-ID')}</p></button>{/each}</div>{/if}</Card></div>
</div>
