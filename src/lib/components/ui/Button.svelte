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
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  variant === 'default' && 'bg-primary text-primary-foreground shadow-sm hover:brightness-110',
  variant === 'outline' && 'border border-border bg-card text-card-foreground hover:border-primary hover:bg-primary/10 hover:text-primary',
  variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground',
  variant === 'destructive' && 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  size === 'default' && 'h-9 px-4', size === 'sm' && 'h-8 px-3 text-xs', size === 'icon' && 'h-9 w-9', className
)}>
  <slot />
</button>
