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
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50',
  variant === 'default' && 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  variant === 'outline' && 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800',
  variant === 'ghost' && 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
  variant === 'destructive' && 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
  size === 'default' && 'h-9 px-4', size === 'sm' && 'h-8 px-3 text-xs', size === 'icon' && 'h-9 w-9', className
)}>
  <slot />
</button>
