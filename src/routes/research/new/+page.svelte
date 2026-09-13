<script lang="ts">
  import { goto } from '$app/navigation';
  import { ArrowLeft, Image, Info, Play, Video } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { api } from '$lib/api';
  import type { AssetType, ResearchMode } from '$lib/types';

  let keyword = '';
  let category = 'general';
  let assetType: AssetType = 'images';
  let locale = 'en-GB';
  let maxSuggestions = 5;
  let assetsPerQuery = 30;
  let mode: ResearchMode = 'fast';
  let submitting = false;
  let error = '';

  async function submit() {
    if (!keyword.trim()) { error = 'Seed keyword wajib diisi.'; return; }
    submitting = true; error = '';
    try {
      const run = await api.createRun({ keyword: keyword.trim(), category, assetType, locale, maxSuggestions, assetsPerQuery, mode });
      await goto(`/research/${run.id}`);
    } catch (err) { error = err instanceof Error ? err.message : 'Research gagal dibuat'; }
    finally { submitting = false; }
  }
</script>

<svelte:head><title>New research — StockScope</title></svelte:head>

<div class="mx-auto max-w-3xl space-y-6">
  <div><a href="/" class="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200"><ArrowLeft size={14} /> Back to overview</a><p class="text-xs font-medium uppercase tracking-widest text-cyan-400">Research setup</p><h1 class="mt-2 text-2xl font-semibold tracking-tight">Start a new research</h1><p class="mt-1 text-sm text-slate-500">Gunakan keyword inti untuk mengambil suggestion dan ranking aset Adobe Stock.</p></div>

  <Card className="p-5 sm:p-6">
    <form on:submit|preventDefault={submit} class="space-y-6">
      <div class="space-y-2"><label for="keyword" class="text-sm font-medium">Seed keyword</label><Input id="keyword" bind:value={keyword} placeholder="e.g. sustainable business, remote work, wellness" /><p class="text-xs text-slate-600">Coba gunakan frasa yang ingin Anda validasi untuk konten baru.</p></div>

      <div class="space-y-2"><label for="category" class="text-sm font-medium">Category</label><select id="category" bind:value={category} class="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400"><option value="general">General</option><option value="business">Business</option><option value="technology">Technology</option><option value="wellness">Wellness</option><option value="sustainability">Sustainability</option><option value="finance">Finance</option><option value="lifestyle">Lifestyle</option><option value="travel">Travel</option><option value="food">Food</option></select><p class="text-xs text-slate-600">Dipakai untuk mengelompokkan insight lintas research.</p></div>

      <div class="space-y-2"><p class="text-sm font-medium">Asset type</p><div class="grid grid-cols-2 gap-2">
        <button type="button" class={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${assetType === 'images' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800'}`} on:click={() => assetType = 'images'}><Image size={18} /><span><span class="block text-sm font-medium">Images</span><span class="mt-0.5 block text-[11px] opacity-70">Photos, illustrations & vectors</span></span></button>
        <button type="button" class={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${assetType === 'videos' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800'}`} on:click={() => assetType = 'videos'}><Video size={18} /><span><span class="block text-sm font-medium">Videos</span><span class="mt-0.5 block text-[11px] opacity-70">Stock footage & motion</span></span></button>
      </div></div>

      <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><label for="locale" class="text-sm font-medium">Locale</label><select id="locale" bind:value={locale} class="flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select><p class="text-xs text-slate-600">Mempengaruhi suggestion Adobe.</p></div><div class="space-y-2"><label for="suggestions" class="text-sm font-medium">Max suggestions</label><Input id="suggestions" type="number" bind:value={maxSuggestions} /><p class="text-xs text-slate-600">1–50. Mulai kecil untuk menghemat request.</p></div></div>
      <div class="space-y-2"><label for="assets" class="text-sm font-medium">Assets per query</label><Input id="assets" type="number" bind:value={assetsPerQuery} /><p class="text-xs text-slate-600">1–100 aset untuk setiap kombinasi suggestion dan sort mode.</p></div>

      <div class="flex gap-3 rounded-md border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs leading-5 text-slate-400"><Info size={16} class="mt-0.5 shrink-0 text-cyan-400" /><span>Adobe Stock tidak menampilkan angka download individual. Sistem menyimpan <span class="font-mono text-cyan-300">download_rank</span> sebagai proxy popularitas.</span></div>
      <div class="space-y-2"><p class="text-sm font-medium">Research mode</p><div class="grid gap-2 sm:grid-cols-2"><button type="button" class={`rounded-md border p-3 text-left transition-colors ${mode === 'fast' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800'}`} on:click={() => mode = 'fast'}><span class="block text-sm font-medium">Fast</span><span class="mt-1 block text-[11px] opacity-70">Downloads only, autocomplete terbatas, keyword detail 1 asset/query.</span></button><button type="button" class={`rounded-md border p-3 text-left transition-colors ${mode === 'full' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800'}`} on:click={() => mode = 'full'}><span class="block text-sm font-medium">Full</span><span class="mt-1 block text-[11px] opacity-70">Downloads, relevance, recent, dan keyword detail semua asset downloads.</span></button></div></div>

      {#if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}
      <div class="flex justify-end gap-2 border-t border-slate-800 pt-5"><a href="/"><Button variant="ghost" type="button">Cancel</Button></a><Button type="submit" disabled={submitting || !keyword.trim()}><Play size={15} />{submitting ? 'Creating…' : 'Start research'}</Button></div>
    </form>
  </Card>
</div>
