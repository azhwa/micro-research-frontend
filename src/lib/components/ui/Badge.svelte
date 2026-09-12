<script lang="ts">
  import { cn } from '$lib/utils';
  export let tone: 'default' | 'muted' | 'success' | 'warning' | 'danger' = 'default';
  export let className = '';
</script>

<span class={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
  tone === 'default' && 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
  tone === 'muted' && 'border-slate-700 bg-slate-800/60 text-slate-400',
  tone === 'success' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  tone === 'warning' && 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  tone === 'danger' && 'border-red-400/30 bg-red-400/10 text-red-300', className)}><slot /></span>
