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
    error = ''; loading = true;
    try { await api.login({ username, password }); await goto('/'); }
    catch (err) { error = err instanceof ApiError && err.status === 401 ? 'Username atau password salah.' : err instanceof Error ? err.message : 'Login tidak dapat diproses.'; }
    finally { loading = false; }
  }
  onMount(() => { void (async () => { try { await api.getAuthMe(); await goto('/'); } catch { checking = false; } })(); });
</script>

<svelte:head><title>Sign in | StockScope</title></svelte:head>
<div class="flex min-h-[calc(100vh-7rem)] items-center justify-center py-10"><div class="w-full max-w-md space-y-5"><div class="text-center"><div class="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#d75a3b] text-white"><Layers3 size={20} /></div><h1 class="mt-4 text-xl font-bold">Sign in to StockScope</h1><p class="mt-1 text-sm text-[#77736b]">Masuk ke workspace riset pribadi.</p></div><Card className="p-5"><div class="mb-5 flex items-center gap-2 text-xs font-semibold text-[#77736b]"><LockKeyhole size={14} class="text-[#d75a3b]" /> Login pribadi</div>{#if checking}<div class="py-8 text-center text-sm text-[#77736b]">Memeriksa session...</div>{:else}<form class="space-y-4" on:submit|preventDefault={() => void submit()}>{#if error}<div class="rounded-md border border-[#b94035]/25 bg-[#fff0ee] p-3 text-sm text-[#a3372f]">{error}</div>{/if}<label class="block text-xs font-semibold text-[#6d6a63]">Username<input bind:value={username} autocomplete="username" required class="mt-1 h-11 w-full rounded-md border border-[#cfcac0] bg-[#fffdfa] px-3 text-sm outline-none focus:border-[#d75a3b]" /></label><label class="block text-xs font-semibold text-[#6d6a63]">Password<input type="password" bind:value={password} autocomplete="current-password" required class="mt-1 h-11 w-full rounded-md border border-[#cfcac0] bg-[#fffdfa] px-3 text-sm outline-none focus:border-[#d75a3b]" /></label><button type="submit" disabled={loading} class="h-11 w-full rounded-md bg-[#d75a3b] px-4 text-sm font-semibold text-white transition hover:bg-[#bd4b31] disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in'}</button></form>{/if}</Card></div></div>
