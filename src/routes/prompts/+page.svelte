<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Copy, Download, Image, Lightbulb, LoaderCircle, RefreshCw, Sparkles, Trash2, Video } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { api } from '$lib/api';
  import { seedPacks } from '$lib/seed-library';
  import type { AssetType, PromptGeneration, SavedPrompt } from '$lib/types';

  let seed = '';
  let category = 'business';
  let assetType: AssetType = 'images';
  let locale = 'en-GB';
  let count = 5;
  let style = 'commercial stock photography';
  let generation: PromptGeneration | null = null;
  let savedPrompts: SavedPrompt[] = [];
  let savedLoading = true;
  let deletingPromptId = '';
  let loading = false;
  let error = '';
  let copiedPrompt = '';
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function loadSavedPrompts(): Promise<void> {
    savedLoading = true;
    try {
      savedPrompts = await api.listSavedPrompts(200);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt tersimpan tidak dapat dimuat';
    } finally {
      savedLoading = false;
    }
  }

  async function generate(): Promise<void> {
    const value = seed.trim();
    if (!value) {
      error = 'Masukkan seed atau arah visual terlebih dahulu.';
      return;
    }

    loading = true;
    error = '';
    try {
      const result = await api.generatePrompts({ seed: value, category, assetType, locale, count, style });
      generation = result.generation;
      await loadSavedPrompts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt generation gagal';
    } finally {
      loading = false;
    }
  }

  async function copyPrompt(value: string, id: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      copiedPrompt = id;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copiedPrompt = ''; }, 1600);
    } catch {
      error = 'Prompt tidak dapat disalin ke clipboard';
    }
  }

  async function deletePrompt(item: SavedPrompt): Promise<void> {
    if (!window.confirm(`Hapus prompt “${item.title}”?`)) return;
    deletingPromptId = item.id;
    try {
      await api.deleteSavedPrompt(item.id);
      savedPrompts = savedPrompts.filter((prompt) => prompt.id !== item.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt tidak dapat dihapus';
    } finally {
      deletingPromptId = '';
    }
  }

  async function exportPrompts(format: 'csv' | 'txt'): Promise<void> {
    try {
      await api.downloadPromptExport(format);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Export prompt gagal';
    }
  }

  onMount(loadSavedPrompts);
  onDestroy(() => { if (copyTimer) clearTimeout(copyTimer); });
</script>

<svelte:head><title>Prompt Studio | StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div>
      <p class="eyebrow">Prompt studio</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight">Turn market signals into image prompts.</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-[#6d6a63]">Buat beberapa konsep visual sekaligus dengan seed, keyword scoring, dan konteks research yang sudah ada.</p>
    </div>
    <a href="/discover"><Button variant="outline" size="sm"><Sparkles size={14} /> Discover ideas</Button></a>
  </section>

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
    <Card className="p-5 sm:p-6">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={18} /></div>
        <div><p class="text-xs font-bold uppercase tracking-wider text-primary">Create a prompt set</p><h2 class="mt-1 text-lg font-bold">What do you want to create?</h2><p class="mt-1 text-xs leading-5 text-[#77736b]">Seed bisa berasal dari hasil research atau ide manual Anda.</p></div>
      </div>

      <form class="mt-6 space-y-5" on:submit|preventDefault={generate}>
        <div class="space-y-2"><label for="prompt-seed" class="text-sm font-semibold">Seed or visual direction</label><Input id="prompt-seed" bind:value={seed} placeholder="e.g. remote work collaboration" /></div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2"><label for="prompt-category" class="text-sm font-semibold">Market category</label><select id="prompt-category" bind:value={category} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground outline-none focus:border-primary">{#each seedPacks as item}<option value={item.id}>{item.label}</option>{/each}</select></div>
          <div class="space-y-2"><label for="prompt-locale" class="text-sm font-semibold">Adobe locale</label><select id="prompt-locale" bind:value={locale} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground outline-none focus:border-primary"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select></div>
        </div>
        <div class="space-y-2"><p class="text-sm font-semibold">Asset format</p><div class="grid grid-cols-2 gap-2"><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'images' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'images'}><Image size={14} /> Images</button><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'videos' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'videos'}><Video size={14} /> Videos</button></div></div>
        <div class="grid gap-4 sm:grid-cols-2"><div class="space-y-2"><label for="prompt-count" class="text-sm font-semibold">How many prompts?</label><select id="prompt-count" bind:value={count} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground outline-none focus:border-primary"><option value={3}>3 focused prompts</option><option value={5}>5 balanced prompts</option><option value={10}>10 varied prompts</option><option value={20}>20 broad prompts</option></select></div><div class="space-y-2"><label for="prompt-style" class="text-sm font-semibold">Visual direction</label><select id="prompt-style" bind:value={style} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground outline-none focus:border-primary"><option value="commercial stock photography">Commercial photo</option><option value="clean stock illustration">Stock illustration</option><option value="editorial lifestyle concept">Lifestyle concept</option></select></div></div>
        {#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}
        <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-muted-foreground">AI akan memakai global scoring dan evidence yang tersedia. Satu request menghasilkan satu set prompt.</p><Button type="submit" disabled={loading}>{#if loading}<LoaderCircle size={15} class="animate-spin" /> Generating...{:else}<Sparkles size={15} /> Generate{/if}</Button></div>
      </form>
    </Card>

    <Card className="surface-dotted p-5">
      <div class="flex items-center gap-2"><Lightbulb size={16} class="text-primary" /><h2 class="text-sm font-bold">How this works</h2></div>
      <ol class="mt-4 space-y-4 text-xs leading-5 text-muted-foreground"><li class="flex gap-3"><span class="font-mono text-primary">01</span><span>Seed menjadi arah dasar, bukan prompt acak tanpa konteks.</span></li><li class="flex gap-3"><span class="font-mono text-primary">02</span><span>Keyword scoring dan asset evidence membantu AI memilih konsep yang lebih komersial.</span></li><li class="flex gap-3"><span class="font-mono text-primary">03</span><span>Gunakan prompt di Firefly, Midjourney, atau generator pilihan Anda lalu validasi kembali di Adobe Stock.</span></li></ol>
      <div class="mt-6 rounded-md border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Tip: mulai dari 3–5 prompt untuk membandingkan angle visual sebelum membuat batch besar.</div>
    </Card>
  </div>

  {#if generation?.response}
    <Card className="p-5 sm:p-6">
      <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p class="eyebrow">Generated set</p><h2 class="mt-1 text-lg font-bold">Prompt ideas for “{seed.trim()}”</h2><p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{generation.response.summary}</p></div><span class="text-xs text-muted-foreground">{generation.response.prompts.length} prompts</span></div>
      <div class="mt-5 grid gap-4 lg:grid-cols-2">{#each generation.response.prompts as item, index}<article class="rounded-lg border border-border bg-card p-4"><div class="flex items-start justify-between gap-3"><div><p class="text-sm font-bold">{index + 1}. {item.title}</p><p class="mt-1 text-[11px] text-muted-foreground">{item.confidence} confidence</p></div><Button size="icon" variant="ghost" ariaLabel="Copy prompt" on:click={() => copyPrompt(item.prompt, `${generation?.id}-${index}`)}><Copy size={14} /></Button></div><p class="mt-3 rounded-md bg-muted p-3 text-xs leading-5">{item.prompt}</p><p class="mt-2 text-[11px] text-muted-foreground"><span class="font-semibold">Negative:</span> {item.negativePrompt}</p><p class="mt-2 text-[11px] text-muted-foreground">{item.keywordFocus.join(' · ')}</p><p class="mt-3 text-xs leading-5 text-muted-foreground">{item.commercialRationale}</p>{#if copiedPrompt === `${generation?.id}-${index}`}<p class="mt-2 text-[11px] font-semibold text-success">Prompt disalin</p>{/if}</article>{/each}</div>
      {#if generation.response.cautions.length}<p class="mt-5 text-[11px] leading-5 text-muted-foreground">Catatan: {generation.response.cautions.join(' ')}</p>{/if}
    </Card>
  {/if}

  <Card>
    <div class="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><p class="eyebrow">Prompt library</p><h2 class="mt-1 text-base font-bold">Saved prompts</h2><p class="mt-1 text-xs text-muted-foreground">Prompt yang pernah dibuat tersimpan bersama status dan waktu pembuatannya.</p></div><div class="flex flex-wrap gap-2"><Button size="sm" variant="ghost" on:click={loadSavedPrompts} disabled={savedLoading}><RefreshCw size={13} class={savedLoading ? 'animate-spin' : ''} /> Refresh</Button><Button size="sm" variant="outline" on:click={() => exportPrompts('csv')} disabled={!savedPrompts.length}><Download size={13} /> CSV</Button><Button size="sm" variant="outline" on:click={() => exportPrompts('txt')} disabled={!savedPrompts.length}><Download size={13} /> TXT</Button></div></div>
    {#if savedLoading}<div class="p-8 text-center text-sm text-muted-foreground">Loading saved prompts...</div>{:else if !savedPrompts.length}<div class="p-8 text-center text-sm text-muted-foreground">Belum ada prompt tersimpan. Generate prompt pertama Anda di atas.</div>{:else}<div class="divide-y divide-border/50">{#each savedPrompts as item}<article class="p-5"><div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-bold">{item.title}</h3><span class="rounded-sm border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">{item.status}</span></div><p class="mt-1 text-[11px] text-muted-foreground">{item.seed} · {item.category} · {new Date(item.createdAt).toLocaleString('id-ID')}</p></div><Button size="icon" variant="ghost" ariaLabel={`Delete ${item.title}`} on:click={() => deletePrompt(item)} disabled={deletingPromptId === item.id}>{#if deletingPromptId === item.id}<LoaderCircle size={14} class="animate-spin" />{:else}<Trash2 size={14} />{/if}</Button></div><p class="mt-3 rounded-md bg-muted p-3 text-xs leading-5">{item.prompt}</p><div class="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground"><span>Confidence: {item.confidence}</span>{#if item.keywordFocus.length}<span>{item.keywordFocus.join(' · ')}</span>{/if}</div></article>{/each}</div>{/if}
  </Card>
</div>
