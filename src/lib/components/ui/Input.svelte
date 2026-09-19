<script lang="ts">
  import { cn } from '$lib/utils';
  export let value: string | number = '';
  export let placeholder = '';
  export let type = 'text';
  export let id = '';
  export let className = '';
  export let inputmode: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined = undefined;
</script>

<input bind:value {placeholder} {type} {id} {inputmode} class={cn('flex h-10 w-full rounded-md border border-input bg-card px-3 py-1 text-sm text-card-foreground outline-none placeholder:text-muted-foreground focus:border-active focus:ring-2 focus:ring-active/20', className)} />
