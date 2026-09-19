<script lang="ts">
  import { Activity, BarChart3, Compass, Database, FlaskConical, GitCompare, KeyRound, Layers3, LogOut, Search, Settings } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ApiError, api } from '$lib/api';
  import { cn } from '$lib/utils';
  let backendStatus: 'checking' | 'online' | 'offline' = 'checking';
  let authReady = false;
  let signedIn = false;

  async function handleLogout(): Promise<void> {
    await api.logout();
    await goto('/sign-in');
  }

  onMount(() => {
    let unsubscribe = () => {};
    let unmountUserButton = () => {};
    void (async () => {
      try { await api.getHealth(); backendStatus = 'online'; } catch { backendStatus = 'offline'; }
      try {
        await api.getAuthMe();
        signedIn = true;
        if (page.url.pathname.startsWith('/sign-in')) void goto('/');
      } catch (error) {
        signedIn = false;
        if (!(error instanceof ApiError && error.status === 401)) backendStatus = 'offline';
        if (!page.url.pathname.startsWith('/sign-in')) void goto('/sign-in');
      } finally {
        authReady = true;
      }
    })();
    return () => { unsubscribe(); };
  });
</script>

{#if page.url.pathname.startsWith('/sign-in')}
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-slate-100"><slot /></main>
{:else if !authReady}
  <div class="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">Checking authentication…</div>
{:else if !signedIn}
  <div class="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">Redirecting to sign in…</div>
{:else}
<div class="min-h-screen bg-background text-foreground">
  <header class="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
    <div class="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 lg:px-8">
      <a href="/" class="flex items-center gap-2.5">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400 text-slate-950"><Layers3 size={15} strokeWidth={2.5} /></span>
        <span class="text-sm font-semibold tracking-tight">Stock<span class="text-cyan-400">Scope</span></span>
        <span class="hidden rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">MVP</span>
      </a>
      <div class="flex items-center gap-3 text-xs text-slate-500"><span class={`h-1.5 w-1.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400' : backendStatus === 'offline' ? 'bg-red-400' : 'bg-amber-400'}`}></span>{backendStatus === 'online' ? 'Backend online' : backendStatus === 'offline' ? 'Backend offline' : 'Checking backend'}<button type="button" on:click={() => void handleLogout()} aria-label="Logout" title="Logout" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 px-2.5 text-xs text-slate-400 transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300"><LogOut size={14} /><span class="hidden sm:inline">Logout</span></button></div>
    </div>
  </header>
  <nav class="flex gap-2 overflow-x-auto border-b border-slate-800/70 px-4 py-2 lg:hidden">
    <a href="/" class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900">Overview</a>
    <a href="/discover" class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900">Discover</a>
    <a href="/research/new" class="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900">New research</a>
    <a href="/settings" class="whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-100"><Settings size={13} class="mr-1 inline" />Settings</a>
  </nav>

  <div class="mx-auto flex max-w-[1440px]">
    <aside class="hidden w-56 shrink-0 border-r border-slate-800/70 px-3 py-5 lg:block">
      <p class="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Workspace</p>
      <nav class="space-y-1">
        <a href="/" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname === '/' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><BarChart3 size={16} /> Overview</a>
        <a href="/insights" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname.startsWith('/insights') ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><BarChart3 size={16} /> Global insights</a>
        <a href="/discover" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname.startsWith('/discover') ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><Compass size={16} /> Discover ideas</a>
        <a href="/compare" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname.startsWith('/compare') ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><GitCompare size={16} /> Compare runs</a>
        <a href="/monitoring" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname.startsWith('/monitoring') ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><Activity size={16} /> Monitoring</a>
        <a href="/research/new" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname.startsWith('/research/new') ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><FlaskConical size={16} /> New research</a>
        <a href="/settings" class={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm', page.url.pathname.startsWith('/settings') ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200')}><Settings size={16} /> Settings</a>
      </nav>
      <p class="mb-2 mt-8 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Sources</p>
      <div class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500"><Search size={16} /> Adobe Stock <span class="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"></span></div>
      <div class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600"><Database size={16} /> More sources <span class="ml-auto text-[10px]">soon</span></div>
    </aside>
    <main class="min-w-0 flex-1 px-4 py-6 lg:px-8"><slot /></main>
  </div>
</div>
{/if}
