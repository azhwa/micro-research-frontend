<script lang="ts">
  import { cn } from '$lib/utils';
  export let className = '';
</script>

<section class={cn('rounded-xl border border-[#dedbd3] bg-[#fffdfa] shadow-[0_8px_30px_rgba(60,48,35,0.04)]', className)}><slot /></section>
