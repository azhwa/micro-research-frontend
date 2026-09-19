<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import type { ResearchDetailLog } from '$lib/types';
  import { formatDate } from '$lib/utils';

  export let logs: ResearchDetailLog[] = [];
  export let isLive = false;

  function assetLogSummary(log: ResearchDetailLog) {
    const assets = log.assets ?? [];
    const valid = assets.filter((asset) => asset.thumbnail === 'valid').length;
    return `${assets.length} asset · ${valid} thumbnail valid · ${assets.length - valid} thumbnail kosong`;
  }

  function keywordLogSummary(log: ResearchDetailLog) {
    const summary = log.summary ?? {};
    return `dipilih ${summary.selected ?? 0} · berhasil ${summary.success ?? 0} · kosong ${summary.empty ?? 0} · gagal ${summary.failed ?? 0}`;
  }
</script>

<Card>
  <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
    <div>
      <h2 class="text-sm font-medium">Data extraction detail</h2>
      <p class="mt-0.5 text-xs text-slate-500">Batch asset dan hasil keyword dari crawler</p>
    </div>
    {#if isLive}<span class="text-xs text-emerald-400">● Live</span>{/if}
  </div>
  {#if !logs.length}
    <div class="p-6 text-xs text-slate-600">Belum ada detail extraction.</div>
  {:else}
    <div class="divide-y divide-slate-800/60">
      {#each logs as log}
        <details class="group px-4 py-3">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-xs marker:hidden">
            <div class="min-w-0">
              <p class="font-medium text-slate-300">{log.type === 'assets_observed' ? 'Asset batch' : 'Keyword enrichment'} · {log.query || 'Page One'} · {log.sortMode || ''}</p>
              <p class="mt-1 text-[10px] text-slate-500">{log.type === 'assets_observed' ? assetLogSummary(log) : keywordLogSummary(log)}</p>
            </div>
            <span class="shrink-0 font-mono text-[10px] text-slate-600">{formatDate(log.createdAt)}</span>
          </summary>
          {#if log.type === 'assets_observed'}
            <div class="mt-3 overflow-x-auto rounded border border-slate-800 bg-slate-950/60">
              <table class="w-full min-w-[680px] text-left text-[11px]">
                <thead class="border-b border-slate-800 text-[10px] uppercase text-slate-600"><tr><th class="px-3 py-2">Rank</th><th class="px-3 py-2">External ID</th><th class="px-3 py-2">Title</th><th class="px-3 py-2">Thumbnail</th></tr></thead>
                <tbody class="divide-y divide-slate-800/60">
                  {#each log.assets ?? [] as asset}
                    <tr><td class="px-3 py-2 font-mono text-slate-500">#{asset.rank}</td><td class="px-3 py-2 font-mono text-cyan-300">{asset.externalId}</td><td class="max-w-[360px] truncate px-3 py-2 text-slate-400">{asset.title || 'Untitled asset'}</td><td class="px-3 py-2"><span class={asset.thumbnail === 'valid' ? 'text-emerald-400' : 'text-amber-400'}>{asset.thumbnail}</span></td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else if log.summary}
            <div class="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              <span class="rounded border border-slate-800 px-3 py-2 text-slate-500">Dipilih <b class="text-slate-300">{log.summary.selected ?? 0}</b></span>
              <span class="rounded border border-slate-800 px-3 py-2 text-slate-500">Berhasil <b class="text-emerald-400">{log.summary.success ?? 0}</b></span>
              <span class="rounded border border-slate-800 px-3 py-2 text-slate-500">Kosong <b class="text-amber-400">{log.summary.empty ?? 0}</b></span>
              <span class="rounded border border-slate-800 px-3 py-2 text-slate-500">Gagal <b class="text-red-400">{log.summary.failed ?? 0}</b></span>
            </div>
          {/if}
        </details>
      {/each}
    </div>
  {/if}
</Card>
