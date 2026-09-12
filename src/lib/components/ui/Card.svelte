<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<section class={cn('rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm', className)}><slot /></section>
