<script lang="ts">
  import { cn } from '$lib/utils';
  export let value: string | number = '';
  export let placeholder = '';
  export let type = 'text';
  export let id = '';
  export let className = '';
  export let inputmode: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined = undefined;
</script>

<input bind:value {placeholder} {type} {id} {inputmode} class={cn('flex h-10 w-full rounded-md border border-[#cfcac0] bg-[#fffdfa] px-3 py-1 text-sm text-[#242322] outline-none placeholder:text-[#99948a] focus:border-[#d75a3b] focus:ring-2 focus:ring-[#d75a3b]/15', className)} />
