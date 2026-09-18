<script lang="ts">
  import { cn } from '$lib/utils';
  export let value: string | number = '';
  export let placeholder = '';
  export let type = 'text';
  export let id = '';
  export let className = '';
  export let inputmode: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined = undefined;
</script>

<input bind:value {placeholder} {type} {id} {inputmode} class={cn('flex h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30', className)} />
