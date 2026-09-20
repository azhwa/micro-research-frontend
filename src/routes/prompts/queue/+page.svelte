<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import PromptQueuePanel from '$lib/components/PromptQueuePanel.svelte';
</script>

<svelte:head><title>Prompt Queue | StockScope</title></svelte:head>

<div class="mx-auto max-w-6xl space-y-7">
  <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p class="eyebrow">Prompt studio / queue</p><h1 class="mt-2 text-3xl font-bold tracking-tight">Prompt Queue</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Keyword dari AI Readout atau input manual menunggu di sini sampai Anda memilih jumlah, output, dan style sebelum generate.</p></div><a href="/prompts"><Button variant="outline" size="sm">Back to Generator</Button></a></section>
  <PromptQueuePanel />
</div>
