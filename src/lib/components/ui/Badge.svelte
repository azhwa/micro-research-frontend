<script lang="ts">
  import { cn } from '$lib/utils';
  export let tone: 'default' | 'muted' | 'success' | 'warning' | 'danger' = 'default';
  export let className = '';
</script>

<span class={cn('inline-flex items-center rounded-sm border px-2 py-1 text-[11px] font-semibold leading-none',
  tone === 'default' && 'border-primary/30 bg-primary/10 text-primary',
  tone === 'muted' && 'border-border bg-muted text-muted-foreground',
  tone === 'success' && 'border-success/30 bg-success/10 text-success',
  tone === 'warning' && 'border-warning/35 bg-warning/10 text-warning',
  tone === 'danger' && 'border-destructive/25 bg-destructive/10 text-destructive', className)}><slot /></span>
