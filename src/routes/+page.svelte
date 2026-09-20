<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => { void goto('/insights', { replaceState: true }); });
</script>

<svelte:head><title>Global insight | StockScope</title></svelte:head>
<div class="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Membuka Global insight...</div>
