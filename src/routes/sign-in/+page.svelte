<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Layers3, LockKeyhole } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { ApiError, api } from '$lib/api';

  let username = '';
  let password = '';
  let loading = false;
  let checking = true;
  let error = '';

  async function submit(): Promise<void> {
    error = '';
    loading = true;
    try {
      await api.login({ username, password });
      await goto('/');
    } catch (err) {
      error = err instanceof ApiError && err.status === 401
        ? 'Username atau password salah.'
        : err instanceof Error ? err.message : 'Login tidak dapat diproses.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void (async () => {
      try {
        await api.getAuthMe();
        await goto('/');
      } catch {
        checking = false;
      }
    })();
  });
</script>

<svelte:head><title>Sign in — StockScope</title></svelte:head>
<div class="flex min-h-[calc(100vh-7rem)] items-center justify-center py-10">
  <div class="w-full max-w-md space-y-5">
    <div class="text-center">
      <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-cyan-400 text-slate-950"><Layers3 size={20} /></div>
      <h1 class="mt-4 text-xl font-semibold">Sign in to StockScope</h1>
      <p class="mt-1 text-sm text-slate-500">Masuk ke workspace riset pribadi.</p>
    </div>
    <Card className="p-4">
      <div class="mb-4 flex items-center gap-2 text-xs text-slate-500"><LockKeyhole size={14} class="text-cyan-400" /> Login pribadi</div>
      {#if checking}
        <div class="py-8 text-center text-sm text-slate-500">Memeriksa session…</div>
      {:else}
        <form class="space-y-4" on:submit|preventDefault={() => void submit()}>
          {#if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}
          <label class="block text-xs text-slate-400">Username<input bind:value={username} autocomplete="username" required class="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" /></label>
          <label class="block text-xs text-slate-400">Password<input type="password" bind:value={password} autocomplete="current-password" required class="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-400" /></label>
          <button type="submit" disabled={loading} class="h-10 w-full rounded-md bg-cyan-400 px-4 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      {/if}
    </Card>
  </div>
</div>
