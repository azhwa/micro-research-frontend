<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Layers3, LockKeyhole } from '@lucide/svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import { loadClerk, clerkConfigured } from '$lib/clerk';

  let signInNode: HTMLDivElement;
  let loading = true;
  let error = '';

  onMount(() => {
    let unmount = () => {};
    void (async () => {
      if (!clerkConfigured()) { loading = false; error = 'Clerk belum dikonfigurasi. Isi PUBLIC_CLERK_PUBLISHABLE_KEY pada frontend.'; return; }
      try {
        const clerk = await loadClerk();
        if (!clerk) throw new Error('Clerk tidak tersedia');
        if (clerk.user) { await goto('/'); return; }
        clerk.mountSignIn(signInNode, { signUpUrl: '/sign-in' });
        unmount = () => clerk.unmountSignIn(signInNode);
      } catch (err) { error = err instanceof Error ? err.message : 'Sign in tidak dapat dimuat'; }
      finally { loading = false; }
    })();
    return () => unmount();
  });
</script>

<svelte:head><title>Sign in — StockScope</title></svelte:head>
<div class="flex min-h-[calc(100vh-7rem)] items-center justify-center py-10"><div class="w-full max-w-md space-y-5"><div class="text-center"><div class="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-cyan-400 text-slate-950"><Layers3 size={20} /></div><h1 class="mt-4 text-xl font-semibold">Sign in to StockScope</h1><p class="mt-1 text-sm text-slate-500">Akses hanya tersedia melalui invitation.</p></div><Card className="p-4"><div class="mb-4 flex items-center gap-2 text-xs text-slate-500"><LockKeyhole size={14} class="text-cyan-400" /> Invite-only workspace</div>{#if loading}<div class="py-8 text-center text-sm text-slate-500">Loading secure sign in…</div>{:else if error}<div class="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>{/if}<div bind:this={signInNode}></div></Card></div></div>
