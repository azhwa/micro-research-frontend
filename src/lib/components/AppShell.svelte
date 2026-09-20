<script lang="ts">
  import { Activity, BarChart3, Compass, Database, FlaskConical, GitCompare, Layers3, List, LogOut, Moon, Search, Settings, Sparkles, Sun } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { ApiError, api } from '$lib/api';
  import { cn } from '$lib/utils';

  let backendStatus: 'checking' | 'online' | 'offline' = 'checking';
  let authReady = false;
  let signedIn = false;
  let theme: 'light' | 'dark' = 'light';

  const navigation = [
    { href: '/', label: 'Overview', icon: BarChart3 },
    { href: '/discover', label: 'Discover ideas', icon: Compass },
    { href: '/prompts', label: 'Prompt Studio', icon: Sparkles },
    { href: '/research-queue', label: 'Research queue', icon: List },
    { href: '/insights', label: 'Global insights', icon: BarChart3 },
    { href: '/compare', label: 'Compare runs', icon: GitCompare },
    { href: '/monitoring', label: 'Monitoring', icon: Activity },
    { href: '/research/new', label: 'New research', icon: FlaskConical },
    { href: '/settings', label: 'Settings', icon: Settings }
  ];

  async function handleLogout(): Promise<void> {
    await api.logout();
    await goto('/sign-in');
  }

  function applyTheme(nextTheme: 'light' | 'dark'): void {
    theme = nextTheme;
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('stockscope-theme', nextTheme);
  }

  function toggleTheme(): void {
    applyTheme(theme === 'light' ? 'dark' : 'light');
  }

  onMount(() => {
    const savedTheme = localStorage.getItem('stockscope-theme');
    const preferredTheme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(preferredTheme);
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
      } finally { authReady = true; }
    })();
  });
</script>

{#if page.url.pathname.startsWith('/sign-in')}
  <main class="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#242322]"><slot /></main>
{:else if !authReady}
  <div class="flex min-h-screen items-center justify-center bg-[#f7f5f0] text-sm text-[#77736b]">Checking authentication...</div>
{:else if !signedIn}
  <div class="flex min-h-screen items-center justify-center bg-[#f7f5f0] text-sm text-[#77736b]">Redirecting to sign in...</div>
{:else}
<div class="min-h-screen bg-background text-foreground">
  <header class="sticky top-0 z-20 border-b border-[#dedbd3]/90 bg-[#f7f5f0]/95 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 lg:px-8">
      <a href="/" class="flex items-center gap-2.5">
        <span class="flex h-8 w-8 items-center justify-center rounded-md bg-[#d75a3b] text-black"><Database size={16} strokeWidth={2.5} /></span>
        <span class="text-[15px] font-bold tracking-tight">Stock<span class="text-[#d75a3b]">Scope</span></span>
        <span class="hidden rounded border border-[#d6d1c7] px-1.5 py-0.5 text-[10px] font-semibold text-[#8d897f] sm:inline">PRIVATE LAB</span>
      </a>
      <div class="flex items-center gap-3 text-xs text-[#77736b]"><span class={`h-2 w-2 rounded-full ${backendStatus === 'online' ? 'bg-[#5a9b6c]' : backendStatus === 'offline' ? 'bg-[#b94035]' : 'bg-[#d29b45]'}`}></span><span class="hidden sm:inline">{backendStatus === 'online' ? 'Backend online' : backendStatus === 'offline' ? 'Backend offline' : 'Checking backend'}</span><button type="button" on:click={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title={theme === 'light' ? 'Dark mode' : 'Light mode'} class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d6d1c7] bg-[#fffdfa] text-[#6d6a63] transition-colors hover:border-[#d75a3b] hover:bg-[#fff0eb] hover:text-[#a74630]">{#if theme === 'light'}<Moon size={15} />{:else}<Sun size={15} />{/if}</button><button type="button" on:click={() => void handleLogout()} aria-label="Logout" title="Logout" class="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#d6d1c7] bg-[#fffdfa] px-2.5 text-xs font-semibold text-[#6d6a63] transition-colors hover:border-[#b94035]/40 hover:bg-[#fff0ee] hover:text-[#a3372f]"><LogOut size={14} /><span class="hidden sm:inline">Logout</span></button></div>
    </div>
  </header>
  <nav class="flex gap-1 overflow-x-auto border-b border-[#dedbd3] bg-[#fffdfa] px-4 py-2 lg:hidden">
    {#each navigation.slice(0, 4) as item}<a href={item.href} class={cn('whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold', page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href)) ? 'bg-active/10 text-active' : 'text-[#77736b] hover:bg-[#f1eee8]')}><svelte:component this={item.icon} size={13} class="mr-1 inline" />{item.label}</a>{/each}
  </nav>
  <div class="mx-auto flex max-w-[1480px]">
    <aside class="hidden w-60 shrink-0 border-r border-[#dedbd3] px-3 py-6 lg:block">
      <p class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a958b]">Workspace</p>
      <nav class="space-y-1">{#each navigation as item}<a href={item.href} class={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium', page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href)) ? 'bg-active/10 text-active' : 'text-[#6d6a63] hover:bg-[#efede7] hover:text-[#242322]')}><svelte:component this={item.icon} size={16} /> {item.label}</a>{/each}</nav>
      <p class="mb-2 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a958b]">Sources</p>
      <div class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#6d6a63]"><Search size={16} /> Adobe Stock <span class="ml-auto h-2 w-2 rounded-full bg-[#5a9b6c]"></span></div><div class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#a19c92]"><Database size={16} /> More sources <span class="ml-auto text-[10px]">soon</span></div>
      <div class="mt-10 rounded-lg border border-[#eadfd8] bg-[#fff6f2] p-3"><p class="text-[11px] font-bold uppercase tracking-wider text-[#a74630]">Working note</p><p class="mt-2 text-xs leading-5 text-[#7e665f]">Gunakan Discover untuk menemukan seed, lalu validasi dengan research Page One.</p></div>
    </aside>
    <main class="min-w-0 flex-1 px-4 py-7 lg:px-9"><slot /></main>
  </div>
</div>
{/if}
