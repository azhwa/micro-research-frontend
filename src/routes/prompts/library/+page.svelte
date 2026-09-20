<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import PromptLibraryPanel from '$lib/components/PromptLibraryPanel.svelte';
</script>

<svelte:head><title>Prompt Library | StockScope</title></svelte:head>

<div class="mx-auto max-w-7xl space-y-7">
  <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="eyebrow">Prompt studio / library</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Prompt Library</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Set prompt dipisahkan berdasarkan tanggal dan generation title supaya hasil riset tidak bercampur.</p></div><a href="/prompts"><Button variant="outline" size="sm">Back to Generator</Button></a></section>
  <PromptLibraryPanel />
</div>
