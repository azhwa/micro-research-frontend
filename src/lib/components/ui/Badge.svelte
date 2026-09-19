<script lang="ts">
  import { cn } from '$lib/utils';
  export let tone: 'default' | 'muted' | 'success' | 'warning' | 'danger' = 'default';
  export let className = '';
</script>

<span class={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
  tone === 'default' && 'border-[#d75a3b]/25 bg-[#fff0eb] text-[#a74630]',
  tone === 'muted' && 'border-[#d5d1c8] bg-[#f4f2ed] text-[#77736b]',
  tone === 'success' && 'border-[#78a887]/30 bg-[#edf7ef] text-[#39704a]',
  tone === 'warning' && 'border-[#d29b45]/35 bg-[#fff7e4] text-[#956a1b]',
  tone === 'danger' && 'border-[#b94035]/25 bg-[#fff0ee] text-[#a3372f]', className)}><slot /></span>
