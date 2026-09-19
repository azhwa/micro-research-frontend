<script lang="ts">
  import { cn } from '$lib/utils';
  export let variant: 'default' | 'outline' | 'ghost' | 'destructive' = 'default';
  export let size: 'default' | 'sm' | 'icon' = 'default';
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let className = '';
  export let ariaLabel = '';
</script>

<button {type} {disabled} aria-label={ariaLabel || undefined} on:click class={cn(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d75a3b] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variant === 'default' && 'bg-[#b94e34] text-white shadow-sm hover:bg-[#9f402d]',
  variant === 'outline' && 'border border-[#c9c5bb] bg-[#fffdfa] text-[#3f3c37] hover:border-[#d75a3b] hover:bg-[#fff6f2]',
  variant === 'ghost' && 'text-[#6d6a63] hover:bg-[#efede7] hover:text-[#242322]',
  variant === 'destructive' && 'bg-[#b94035]/10 text-[#a3372f] hover:bg-[#b94035]/15',
  size === 'default' && 'h-9 px-4', size === 'sm' && 'h-8 px-3 text-xs', size === 'icon' && 'h-9 w-9', className
)}>
  <slot />
</button>
