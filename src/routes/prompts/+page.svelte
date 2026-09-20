<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Copy, Image, LoaderCircle, Sparkles, Video } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { api } from '$lib/api';
  import { seedPacks } from '$lib/seed-library';
  import type { AssetType, PromptGeneration } from '$lib/types';

  const styles = ['commercial stock photography', 'editorial lifestyle', 'product still life', 'isolated subject', 'cinematic image', 'commercial stock video', 'cinematic video', 'editorial footage', 'aerial', 'macro', 'timelapse', 'minimal 3D render'];
  let seed = '';
  let category = 'business';
  let assetType: AssetType = 'images';
  let locale = 'en-GB';
  let count = 5;
  let style = 'commercial stock photography';
  let generation: PromptGeneration | null = null;
  let loading = false;
  let queueing = false;
  let error = '';
  let copiedPrompt = '';
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function generate() {
    const value = seed.trim();
    if (!value) { error = 'Masukkan keyword atau arah visual terlebih dahulu.'; return; }
    loading = true;
    error = '';
    try {
      const result = await api.generatePrompts({ seed: value, category, assetType, locale, count, style, generateAnother: Boolean(generation) });
      generation = result.generation;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt generation gagal';
    } finally { loading = false; }
  }

  async function addToQueue() {
    const value = seed.trim();
    if (!value) { error = 'Isi keyword sebelum menambah Prompt Queue.'; return; }
    queueing = true;
    error = '';
    try {
      const result = await api.queuePrompts([{
        keyword: value,
        category,
        researchAssetType: assetType,
        promptOutputType: assetType === 'videos' ? 'video' : 'image',
        locale,
        promptCount: count,
        recommendedStyle: style
      }]);
      error = `${result.created.length} queued · ${result.duplicate.length} duplicate · ${result.rejected.length} rejected`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Prompt Queue gagal diisi';
    } finally { queueing = false; }
  }

  async function copyPrompt(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      copiedPrompt = id;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copiedPrompt = ''; }, 1600);
    } catch { error = 'Prompt tidak dapat disalin ke clipboard'; }
  }

  onDestroy(() => { if (copyTimer) clearTimeout(copyTimer); });
</script>

<svelte:head><title>Prompt Studio | StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-7">
  <section class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><p class="eyebrow">Prompt studio</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Turn market signals into prompts.</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Buat prompt langsung dari keyword atau arahkan keyword hasil AI Readout ke Prompt Queue untuk diproses nanti.</p></div>
    <div class="flex flex-wrap gap-2"><a href="/prompts/queue"><Button variant="outline" size="sm">Open Prompt Queue</Button></a><a href="/prompts/library"><Button variant="ghost" size="sm">Prompt Library</Button></a></div>
  </section>

  <Card className="p-5 sm:p-6">
    <div class="flex items-start gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={18} /></div><div><p class="text-xs font-bold uppercase tracking-wider text-primary">Generator</p><h2 class="mt-1 text-lg font-bold">Start from a keyword</h2><p class="mt-1 text-xs leading-5 text-muted-foreground">Prompt Queue tetap terpisah dari Research Queue. Generate sekarang hanya memanggil AI untuk input ini.</p></div></div>
    <form class="mt-6 space-y-5" on:submit|preventDefault={generate}>
      <div class="space-y-2"><label for="prompt-seed" class="text-sm font-semibold">Keyword or visual direction</label><Input id="prompt-seed" bind:value={seed} placeholder="e.g. remote work collaboration" /></div>
      <div class="grid gap-4 sm:grid-cols-3"><div class="space-y-2"><label for="prompt-category" class="text-sm font-semibold">Category</label><select id="prompt-category" bind:value={category} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary">{#each seedPacks as item}<option value={item.id}>{item.label}</option>{/each}</select></div><div class="space-y-2"><label for="prompt-locale" class="text-sm font-semibold">Locale</label><select id="prompt-locale" bind:value={locale} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="id-ID">Indonesian</option></select></div><div class="space-y-2"><label for="prompt-count" class="text-sm font-semibold">Prompt count</label><select id="prompt-count" bind:value={count} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value={3}>3 focused</option><option value={5}>5 balanced</option><option value={10}>10 varied</option><option value={20}>20 broad</option></select></div></div>
      <div class="space-y-2"><p class="text-sm font-semibold">Output type</p><div class="grid grid-cols-2 gap-2"><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'images' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'images'}><Image size={14} /> Image</button><button type="button" class={`flex min-h-11 items-center justify-center gap-2 rounded-md border text-xs font-semibold ${assetType === 'videos' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`} on:click={() => assetType = 'videos'}><Video size={14} /> Video</button></div></div>
      <div class="space-y-2"><label for="prompt-style" class="text-sm font-semibold">Visual style override <span class="font-normal text-muted-foreground">(optional)</span></label><select id="prompt-style" bind:value={style} class="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-card-foreground focus:border-primary"><option value="commercial stock photography">AI-guided commercial photo</option>{#each styles.filter((item) => item !== 'commercial stock photography') as item}<option value={item}>{item}</option>{/each}</select></div>
      {#if error}<div class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error" role="alert">{error}</div>{/if}
      <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-muted-foreground">Generate sekarang atau simpan arah ini ke Prompt Queue.</p><div class="flex flex-wrap gap-2"><Button type="button" variant="outline" on:click={addToQueue} disabled={queueing}>{queueing ? 'Adding...' : 'Add to Prompt Queue'}</Button><Button type="submit" disabled={loading}>{#if loading}<LoaderCircle size={15} class="animate-spin" /> Generating...{:else}<Sparkles size={15} /> {generation ? 'Generate another' : 'Generate now'}{/if}</Button></div></div>
    </form>
  </Card>

  {#if generation?.response}
    <Card>
      <div class="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end"><div><p class="eyebrow">Generated set</p><h2 class="mt-1 text-lg font-bold">{generation.generationTitle ?? `Prompt ideas for “${seed.trim()}”`}</h2><p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{generation.response.summary}</p></div><div class="text-right text-xs text-muted-foreground"><p>{generation.response.prompts.length} prompts</p><p class="mt-1">{generation.generationSeed ?? 'base'} · {generation.generationIndex ?? 1}</p></div></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[820px] text-left text-xs"><thead class="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th class="px-5 py-3">#</th><th class="px-3 py-3">Title</th><th class="px-3 py-3">Prompt</th><th class="px-3 py-3">Type / confidence</th><th class="px-3 py-3">Action</th></tr></thead><tbody class="divide-y divide-border/60">{#each generation.response.prompts as item, index}<tr class="align-top hover:bg-muted/30"><td class="px-5 py-4 font-mono text-muted-foreground">{index + 1}</td><td class="max-w-[180px] px-3 py-4 font-semibold">{item.title}</td><td class="max-w-[520px] px-3 py-4"><p class="leading-5">{item.prompt}</p><p class="mt-2 text-[11px] text-muted-foreground">{item.keywordFocus.join(' · ')}</p></td><td class="whitespace-nowrap px-3 py-4"><Badge tone={item.confidence === 'high' ? 'success' : item.confidence === 'low' ? 'warning' : 'muted'}>{item.confidence}</Badge><p class="mt-2 text-[11px] text-muted-foreground">{generation.outputType ?? (assetType === 'videos' ? 'video' : 'image')}</p></td><td class="px-3 py-4"><Button size="icon" variant="ghost" ariaLabel={`Copy ${item.title}`} on:click={() => copyPrompt(item.prompt, `${generation?.id}-${index}`)}>{#if copiedPrompt === `${generation?.id}-${index}`}<span class="text-[10px] text-success">OK</span>{:else}<Copy size={14} />{/if}</Button></td></tr>{/each}</tbody></table></div>
      {#if generation.response.cautions.length}<p class="border-t border-border px-5 py-4 text-[11px] leading-5 text-muted-foreground">Catatan: {generation.response.cautions.join(' ')}</p>{/if}
    </Card>
  {:else}
    <Card className="p-8 text-center"><p class="eyebrow">Generated set</p><p class="mt-2 text-sm text-muted-foreground">Hasil prompt akan tampil sebagai tabel ringkas setelah Generate now selesai.</p></Card>
  {/if}
</div>
