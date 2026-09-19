<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { ArrowRight, Check, Compass, Copy, Image, Lightbulb, LoaderCircle, Sparkles, Video, X } from '@lucide/svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { api } from '$lib/api';
  import { seedPacks } from '$lib/seed-library';
  import type { AssetType, PromptGeneration, ResearchMode, ResearchRun, ResearchQueueItem, SeedDiscoveryJob } from '$lib/types';

  let topic = '';
  let category = 'business';
  let assetType: AssetType = 'images';
  let locale = 'en-GB';
  let count = 10;
  let mode: ResearchMode = 'fast';
  let discovery: SeedDiscoveryJob | null = null;
  let previousJobs: SeedDiscoveryJob[] = [];
  let recentRuns: ResearchRun[] = [];
  let loading = false;
  let loadingHistory = true;
  let error = '';
  let queuedSeeds: string[] = [];
  let queueItems: ResearchQueueItem[] = [];
  let queueLoadingSeed = '';
  let directResearchSeed = '';
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let promptGeneration: PromptGeneration | null = null;
  let promptSeed = '';
  let promptCount = 5;
  let promptStyle = 'commercial stock photography';
  let promptLoading = false;
  let promptError = '';
  let copiedPrompt = '';
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  $: pack = seedPacks.find((item) => item.id === category) ?? seedPacks[0];
  $: isActive = discovery && ['pending', 'running'].includes(discovery.status);
  $: researched = new Set(recentRuns.map((run) => run.seedKeyword.toLowerCase()));

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
    try {
      discovery = await api.createSeedDiscovery({ topic: topic.trim() || undefined, category, assetType, locale, count });
      startPolling(discovery.id);
    } catch (err) { error = err instanceof Error ? err.message : 'Seed discovery gagal dibuat'; }
    finally { loading = false; }
  }

  async function cancelDiscovery() {
    if (!discovery) return;
    try { discovery = await api.cancelSeedDiscoveryJob(discovery.id); if (pollTimer) clearInterval(pollTimer); pollTimer = undefined; }
    catch (err) { error = err instanceof Error ? err.message : 'Discovery tidak dapat dibatalkan'; }
  }

  async function queueSeed(seed: string) {
    queueLoadingSeed = seed;
    error = '';
    try {
      await api.queueResearch({ keyword: seed, category, assetType, locale });
      queuedSeeds = [...new Set([...queuedSeeds, seed])];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Seed tidak dapat dimasukkan ke research queue';
    } finally {
      queueLoadingSeed = '';
    }
  }

  async function beginResearch(seed: string) {
    directResearchSeed = seed;
    error = '';
    try {
      const run = await api.createRun({ keyword: seed, category, assetType, locale, maxSuggestions: 1, assetsPerQuery: 100, autocompleteEnabled: false, mode: 'full' });
      window.location.href = `/research/${run.id}`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Research gagal dibuat';
    } finally {
      directResearchSeed = '';
    }
  }

  async function generatePrompts(seed: string) {
    promptLoading = true;
    promptError = '';
    promptSeed = seed;
    try {
      const result = await api.generatePrompts({ seed, category, assetType, locale, count: promptCount, style: promptStyle });
      promptGeneration = result.generation;
    } catch (err) {
      promptError = err instanceof Error ? err.message : 'Prompt generation gagal';
    } finally {
      promptLoading = false;
    }
  }

  async function copyPrompt(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      copiedPrompt = id;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copiedPrompt = ''; }, 1600);
    } catch {
      promptError = 'Prompt tidak dapat disalin ke clipboard';
    }
  }

  async function loadData() {
    loadingHistory = true;
    try {
      [previousJobs, recentRuns, queueItems] = await Promise.all([api.listSeedDiscoveryJobs(8), api.listRuns(50), api.listResearchQueue()]);
      queuedSeeds = queueItems.filter((item) => item.status === 'queued').map((item) => item.seedKeyword);
    }
    catch { /* The active discovery screen remains usable if history is unavailable. */ }
    finally { loadingHistory = false; }
  }

  onMount(loadData);
  onDestroy(() => { if (pollTimer) clearInterval(pollTimer); if (copyTimer) clearTimeout(copyTimer); });
</script>

<svelte:head><title>Discover ideas | StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><p class="eyebrow">Seed discovery</p><h1 class="mt-2 text-3xl font-bold tracking-tight text-[#242322]">Find a direction worth researching.</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-[#6d6a63]">Gunakan data keyword dan asset yang sudah terkumpul untuk menemukan seed baru. AI memberi alasan dan evidence, bukan sekadar daftar ide.</p></div>
    <a href="/research/new"><Button variant="outline"><Compass size={15} /> Research manual</Button></a>
  </section>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
    <Card className="overflow-hidden">
      <div class="border-b border-[#e8e3da] bg-[#fff8f4] p-5 sm:p-6">
        <div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d75a3b] text-white"><Sparkles size={18} /></div><div><p class="text-xs font-bold uppercase tracking-wider text-[#a74630]">AI seed finder</p><h2 class="mt-1 text-lg font-bold">What should you research next?</h2><p class="mt-1 text-xs leading-5 text-[#7e665f]">Kosongkan topik untuk melihat peluang terbaik dari seluruh global insight Anda.</p></div></div>
        <form class="mt-6 space-y-5" on:submit|preventDefault={discoverSeeds}>
          <div class="space-y-2"><label for="seed-topic" class="text-sm font-semibold">Topic or direction <span class="font-normal text-[#9a958b]">optional</span></label><Input id="seed-topic" bind:value={topic} placeholder="e.g. remote work, mindful travel, clean energy" /></div>
          <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><label for="seed-category" class="text-sm font-semibold">Market category</label><select id="seed-category" bind:value={category} class="h-10 w-full rounded-md border border-[#cfcac0] bg-[#fffdfa] px-3 text-sm text-[#3f3c37] outline-none focus:border-[#d75a3b]">{#each seedPacks as item}<option value={item.id}>{item.label}</option>{/each}</select></div><div class="space-y-2"><label for="seed-count" class="text-sm font-semibold">How many ideas?</label><select id="seed-count" bind:value={count} class="h-10 w-full rounded-md border border-[#cfcac0] bg-[#fffdfa] px-3 text-sm text-[#3f3c37] outline-none focus:border-[#d75a3b]"><option value={5}>5 focused ideas</option><option value={10}>10 balanced ideas</option><option value={20}>20 broad ideas</option><option value={50}>50 research queue</option></select></div></div>
          <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><p class="text-sm font-semibold">Asset format</p><div class="grid grid-cols-2 gap-2"><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'images' ? 'border-active bg-active/10 text-active' : 'border-[#d6d1c7] text-[#77736b] hover:bg-[#f4f2ed]'}`} on:click={() => assetType = 'images'}><Image size={14} /> Images</button><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'videos' ? 'border-active bg-active/10 text-active' : 'border-[#d6d1c7] text-[#77736b] hover:bg-[#f4f2ed]'}`} on:click={() => assetType = 'videos'}><Video size={14} /> Videos</button></div></div><div class="space-y-2"><label for="seed-locale" class="text-sm font-semibold">Adobe locale</label><select id="seed-locale" bind:value={locale} class="h-10 w-full rounded-md border border-[#cfcac0] bg-[#fffdfa] px-3 text-sm text-[#3f3c37] outline-none focus:border-[#d75a3b]"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select></div></div>
          {#if error}<div class="rounded-md border border-[#b94035]/25 bg-[#fff0ee] p-3 text-sm text-[#a3372f]" role="alert">{error}</div>{/if}
          <div class="flex flex-col gap-3 border-t border-[#e8e3da] pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-[#77736b]">1 request akan memakai global scoring, evidence keyword, dan konteks kategori.</p><Button type="submit" disabled={loading || Boolean(isActive)}>{#if loading}<LoaderCircle size={15} class="animate-spin" /> Finding...{:else}<Sparkles size={15} /> Find seed ideas{/if}</Button></div>
        </form>
      </div>
      {#if discovery}
        <div class="p-5 sm:p-6">
          <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div class="flex items-center gap-2"><h2 class="text-base font-bold">{discovery.topic || pack.label}</h2><Badge tone={discovery.status === 'completed' ? 'success' : discovery.status === 'failed' ? 'danger' : discovery.status === 'cancelled' ? 'muted' : 'warning'}>{discovery.status}</Badge></div><p class="mt-1 text-xs text-[#77736b]">{discovery.summary || 'Menganalisis global insights dan menyusun seed kandidat...'}</p></div>{#if isActive}<Button variant="ghost" size="sm" on:click={cancelDiscovery}><X size={14} /> Cancel</Button>{/if}</div>
          {#if isActive}<div class="mt-5"><div class="flex justify-between text-xs text-[#77736b]"><span>Preparing candidates</span><span>{discovery.progressCompleted}/{discovery.progressTotal || 1}</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-[#efede7]"><div class="h-full rounded-full bg-[#d75a3b] transition-all" style={`width:${Math.max(8, Math.min(100, (discovery.progressCompleted / Math.max(discovery.progressTotal, 1)) * 100))}%`}></div></div></div>{/if}
          {#if discovery.errorMessage}<div class="mt-4 rounded-md border border-[#b94035]/25 bg-[#fff0ee] p-3 text-sm text-[#a3372f]">{discovery.errorMessage}</div>{/if}
          {#if discovery.candidates.length}<div class="mt-5 grid gap-3 sm:grid-cols-2">{#each discovery.candidates as candidate}<article class={`rounded-lg border p-4 transition ${queuedSeeds.includes(candidate.keyword) ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-bold">{candidate.keyword}</p><p class="mt-1 text-[11px] text-muted-foreground">{candidate.source.replace('_', ' ')} Â· {candidate.confidence} confidence</p></div><span class="font-mono text-sm font-bold text-primary">{candidate.opportunityScore ?? '--'}</span></div><p class="mt-3 text-xs leading-5 text-muted-foreground">{candidate.rationale}</p><div class="mt-3 flex flex-wrap gap-1.5">{#each candidate.evidenceKeywords.slice(0, 3) as evidence}<span class="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">{evidence}</span>{/each}</div><div class="mt-4 flex flex-wrap gap-2"><Button size="sm" variant={queuedSeeds.includes(candidate.keyword) ? 'default' : 'outline'} disabled={queueLoadingSeed === candidate.keyword || queuedSeeds.includes(candidate.keyword)} on:click={() => queueSeed(candidate.keyword)}>{#if queuedSeeds.includes(candidate.keyword)}<Check size={13} /> Queued{:else}Queue seed{/if}</Button><Button size="sm" variant="ghost" disabled={directResearchSeed === candidate.keyword} on:click={() => beginResearch(candidate.keyword)}>{directResearchSeed === candidate.keyword ? 'Starting...' : 'Research now'} <ArrowRight size={13} /></Button><Button size="sm" variant="ghost" on:click={() => generatePrompts(candidate.keyword)}><Sparkles size={13} /> Prompts</Button></div></article>{/each}</div>{/if}
          {#if promptLoading || promptGeneration || promptError}<div class="mt-6 border-t border-[#e8e3da] pt-5"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p class="eyebrow">Prompt studio</p><h2 class="mt-1 text-base font-bold">Prompts for â€œ{promptSeed}â€</h2><p class="mt-1 text-xs text-[#77736b]">AI memakai keyword scoring, asset evidence, kategori, dan format yang dipilih.</p></div><div class="flex flex-wrap gap-2"><select aria-label="Prompt count" bind:value={promptCount} class="h-9 rounded-md border border-[#cfcac0] bg-[#fffdfa] px-2 text-xs text-[#3f3c37]"><option value={3}>3 prompts</option><option value={5}>5 prompts</option><option value={10}>10 prompts</option><option value={20}>20 prompts</option></select><select aria-label="Prompt style" bind:value={promptStyle} class="h-9 rounded-md border border-[#cfcac0] bg-[#fffdfa] px-2 text-xs text-[#3f3c37]"><option value="commercial stock photography">Commercial photo</option><option value="clean stock illustration">Stock illustration</option><option value="editorial lifestyle concept">Lifestyle concept</option></select><Button size="sm" variant="outline" on:click={() => generatePrompts(promptSeed)} disabled={promptLoading}>{promptLoading ? 'Generatingâ€¦' : 'Regenerate'}</Button></div></div>{#if promptError}<div class="mt-4 rounded-md border border-[#b94035]/25 bg-[#fff0ee] p-3 text-sm text-[#a3372f]">{promptError}</div>{:else if promptLoading}<div class="mt-4 rounded-md bg-[#f7f5f0] p-5 text-sm text-[#77736b]">Menyusun prompt berdasarkan evidence researchâ€¦</div>{:else if promptGeneration?.response}<div class="mt-4"><p class="text-sm text-[#6d6a63]">{promptGeneration.response.summary}</p><div class="mt-4 grid gap-3 lg:grid-cols-2">{#each promptGeneration.response.prompts as item, index}<article class="rounded-lg border border-[#e4e0d7] bg-[#fffdfa] p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-bold text-[#3f3c37]">{index + 1}. {item.title}</p><p class="mt-1 text-[11px] text-[#8d897f]">{item.confidence} confidence</p></div><Button size="icon" variant="ghost" ariaLabel="Copy prompt" on:click={() => copyPrompt(item.prompt, `${promptGeneration?.id}-${index}`)}><Copy size={14} /></Button></div><p class="mt-3 rounded-md bg-[#f7f5f0] p-3 text-xs leading-5 text-[#3f3c37]">{item.prompt}</p><p class="mt-2 text-[11px] text-[#77736b]"><span class="font-semibold">Negative:</span> {item.negativePrompt}</p><p class="mt-2 text-[11px] text-[#9a958b]">{item.keywordFocus.join(' Â· ')}</p><p class="mt-3 text-xs leading-5 text-[#6d6a63]">{item.commercialRationale}</p>{#if copiedPrompt === `${promptGeneration?.id}-${index}`}<p class="mt-2 text-[11px] font-semibold text-[#39704a]">Prompt disalin</p>{/if}</article>{/each}</div>{#if promptGeneration.response.cautions.length}<p class="mt-4 text-[11px] leading-5 text-[#9a958b]">Catatan: {promptGeneration.response.cautions.join(' ')}</p>{/if}</div>{/if}</div>{/if}
          {#if queuedSeeds.length}<div class="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs text-muted-foreground"><span class="font-bold text-foreground">{queuedSeeds.length}</span> seed tersimpan di research queue</p><a href="/research-queue"><Button variant="outline">Open research queue <ArrowRight size={14} /></Button></a></div>{/if}
        </div>
      {/if}
    </Card>

    <div class="space-y-6">
      <Card className="surface-dotted p-5"><div class="flex items-center gap-2"><Lightbulb size={16} class="text-[#d75a3b]" /><h2 class="text-sm font-bold">How this works</h2></div><ol class="mt-4 space-y-4 text-xs leading-5 text-[#6d6a63]"><li class="flex gap-3"><span class="font-mono text-[#d75a3b]">01</span><span>Ambil evidence dari global keyword scoring yang sudah Anda kumpulkan.</span></li><li class="flex gap-3"><span class="font-mono text-[#d75a3b]">02</span><span>AI mengelompokkan peluang dan memperluas seed yang masih relevan.</span></li><li class="flex gap-3"><span class="font-mono text-[#d75a3b]">03</span><span>Pilih kandidat lalu jalankan research Adobe sebagai validasi.</span></li></ol></Card>
      <Card className="p-5"><div class="flex items-center justify-between"><div><p class="eyebrow">Manual ideas</p><h2 class="mt-1 text-sm font-bold">{pack.label}</h2></div><span class="text-xs text-[#9a958b]">fallback</span></div><p class="mt-2 text-xs leading-5 text-[#77736b]">Gunakan seed starter ini saat global context belum cukup untuk AI discovery.</p><div class="mt-4 space-y-1.5">{#each pack.seeds.slice(0, 5) as seed}<button type="button" on:click={() => beginResearch(seed)} class="flex min-h-10 w-full items-center justify-between rounded-md border border-[#e4e0d7] px-3 text-left text-xs font-medium text-[#6d6a63] hover:border-[#d75a3b] hover:bg-[#fff8f4]"><span>{seed}</span>{#if researched.has(seed.toLowerCase())}<span class="text-[10px] text-[#5a9b6c]">researched</span>{/if}</button>{/each}</div></Card>
      <Card className="p-5"><p class="eyebrow">Recent discovery</p>{#if loadingHistory}<p class="mt-3 text-xs text-[#9a958b]">Loading history...</p>{:else if !previousJobs.length}<p class="mt-3 text-xs leading-5 text-[#77736b]">Belum ada sesi discovery. Hasil pertama akan muncul di sini.</p>{:else}<div class="mt-3 space-y-3">{#each previousJobs.slice(0, 4) as job}<button type="button" class="w-full text-left" on:click={() => { discovery = job; if (['pending', 'running'].includes(job.status)) startPolling(job.id); }}><div class="flex items-center justify-between gap-2"><span class="truncate text-xs font-semibold text-[#3f3c37]">{job.topic || job.category}</span><Badge tone={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'danger' : 'muted'}>{job.status}</Badge></div><p class="mt-1 text-[11px] text-[#9a958b]">{job.candidates.length} candidates Â· {new Date(job.createdAt).toLocaleDateString('id-ID')}</p></button>{/each}</div>{/if}</Card>
    </div>
  </div>
</div>
