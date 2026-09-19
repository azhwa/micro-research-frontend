<script lang="ts">
  import { cn } from '$lib/utils';

  export let keyword = '';
  export let level: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  export let label = '';
  export let className = '';

  const levelClasses = {
    0: 'border-border bg-muted text-muted-foreground',
    1: 'border-border bg-muted text-muted-foreground',
    2: 'border-warning/40 bg-warning/10 text-warning',
    3: 'border-success/40 bg-success/10 text-success',
    4: 'border-secondary/40 bg-secondary/10 text-secondary',
    5: 'border-primary/40 bg-primary/10 text-primary'
  } as const;

  const indicatorClasses = {
    0: 'bg-muted-foreground',
    1: 'bg-muted-foreground',
    2: 'bg-warning',
    3: 'bg-success',
    4: 'bg-secondary',
    5: 'bg-primary'
  } as const;
</script>

<span
  class={cn('inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-semibold leading-none', levelClasses[level], className)}
  title={label ? `${label} · Level ${level}` : `Level ${level}`}
>
  <span class={cn('h-1.5 w-1.5 shrink-0 rounded-full', indicatorClasses[level])} aria-hidden="true"></span>
  <span class="truncate">{keyword}</span>
</span>
