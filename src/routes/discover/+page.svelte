<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { ArrowRight, Check, Image, Lightbulb, Sparkles, Video } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { api } from '$lib/api';
  import { seedPacks, type SeedPack } from '$lib/seed-library';
  import type { AssetType, ResearchMode, ResearchRun } from '$lib/types';

  let packId = seedPacks[0].id;
  let selectedSeeds: string[] = [];
  let assetType: AssetType = 'images';
  let locale = 'en-US';
  let maxSuggestions = 3;
  let assetsPerQuery = 20;
  let mode: ResearchMode = 'fast';
  let recentRuns: ResearchRun[] = [];
  let submitting = false;
  let error = '';
  let message = '';

  $: pack = seedPacks.find((item) => item.id === packId) ?? seedPacks[0];
  $: researched = new Set(recentRuns.map((run) => run.seedKeyword.toLowerCase()));

  function toggleSeed(seed: string) {
    if (selectedSeeds.includes(seed)) selectedSeeds = selectedSeeds.filter((item) => item !== seed);
    else if (selectedSeeds.length < 3) selectedSeeds = [...selectedSeeds, seed];
  }

  async function launch() {
    if (!selectedSeeds.length) { error = 'Pilih minimal satu seed keyword.'; return; }
    submitting = true; error = ''; message = '';
    try {
      const created: string[] = [];
      for (const seed of selectedSeeds) {
        const run = await api.createRun({ keyword: seed, category: pack.id, assetType, locale, maxSuggestions, assetsPerQuery, mode });
        created.push(run.id);
      }
      message = `${created.length} research berhasil dibuat.`;
      await goto(`/research/${created[0]}`);
    } catch (err) { error = err instanceof Error ? err.message : 'Research tidak dapat dibuat'; }
    finally { submitting = false; }
  }

  async function loadRecent() { try { recentRuns = await api.listRuns(50); } catch { /* optional */ } }
  function changePack(next: string) { packId = next; selectedSeeds = []; }
  onMount(loadRecent);
</script>

<svelte:head><title>Discover ideas — StockScope</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-6">
  <div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Seed discovery</p><h1 class="text-2xl font-semibold tracking-tight">Start with an idea</h1><p class="mt-1 max-w-2xl text-sm text-slate-500">Pilih area konten. StockScope memberikan kandidat seed keyword agar Anda tidak memulai dari halaman kosong.</p></div>
  <div class="grid gap-5 lg:grid-cols-[240px_1fr]">
    <Card className="h-fit p-3"><p class="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Categories</p><div class="space-y-1">{#each seedPacks as item}<button class={`w-full rounded-md px-3 py-2 text-left text-xs transition-colors ${packId === item.id ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`} on:click={() => changePack(item.id)}>{item.label}</button>{/each}</div></Card>
    <div class="space-y-5"><Card className="p-5"><div class="flex items-start gap-3"><div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300"><Lightbulb size={17} /></div><div><h2 class="text-sm font-medium">{pack.label}</h2><p class="mt-1 text-xs text-slate-500">{pack.description}</p></div></div><div class="mt-5 grid gap-2 sm:grid-cols-2">{#each pack.seeds as seed}<button class={`flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-xs transition-colors ${selectedSeeds.includes(seed) ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`} on:click={() => toggleSeed(seed)}><span>{seed}</span>{#if selectedSeeds.includes(seed)}<Check size={14} class="text-cyan-300" />{:else if researched.has(seed)}<span class="text-[10px] text-slate-600">researched</span>{/if}</button>{/each}</div><p class="mt-3 text-[11px] text-slate-600">Pilih maksimal 3 seed. Adobe autocomplete akan memperluas setiap seed saat research berjalan.</p></Card>
      <Card className="p-5"><div class="mb-4 flex items-center gap-2"><Sparkles size={15} class="text-cyan-400" /><h2 class="text-sm font-medium">Research settings</h2></div><div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><p class="text-xs font-medium text-slate-400">Asset type</p><div class="flex gap-2"><button class={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs ${assetType === 'images' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-500'}`} on:click={() => assetType = 'images'}><Image size={14} /> Images</button><button class={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs ${assetType === 'videos' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-500'}`} on:click={() => assetType = 'videos'}><Video size={14} /> Videos</button></div></div><div class="space-y-2"><label for="discover-locale" class="text-xs font-medium text-slate-400">Locale</label><select id="discover-locale" bind:value={locale} class="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-300 outline-none focus:border-cyan-400"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select></div><div class="space-y-2"><label for="discover-suggestions" class="text-xs font-medium text-slate-400">Max suggestions</label><input id="discover-suggestions" type="number" min="1" max="50" bind:value={maxSuggestions} class="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400" /></div><div class="space-y-2"><label for="discover-assets" class="text-xs font-medium text-slate-400">Assets per query</label><input id="discover-assets" type="number" min="1" max="100" bind:value={assetsPerQuery} class="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400" /></div></div>{#if error}<div class="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>{/if}{#if message}<div class="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">{message}</div>{/if}<div class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4"><p class="text-xs text-slate-500">{selectedSeeds.length}/3 seeds selected</p><Button on:click={launch} disabled={submitting || !selectedSeeds.length}>{submitting ? 'Creating…' : 'Research selected seeds'} <ArrowRight size={14} /></Button></div></Card>
      <Card className="p-5"><div class="space-y-2"><p class="text-xs font-medium text-slate-400">Research mode</p><div class="grid gap-2 sm:grid-cols-2"><button type="button" class={`rounded-md border p-3 text-left text-xs ${mode === 'fast' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-500'}`} on:click={() => mode = 'fast'}><span class="block font-medium">Fast</span><span class="mt-1 block text-[11px] opacity-70">Downloads only, autocomplete terbatas, keyword detail 1 asset/query.</span></button><button type="button" class={`rounded-md border p-3 text-left text-xs ${mode === 'full' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-500'}`} on:click={() => mode = 'full'}><span class="block font-medium">Full</span><span class="mt-1 block text-[11px] opacity-70">Semua sort mode dan keyword detail lebih lengkap.</span></button></div></div></Card>
    </div>
  </div>
</div>
