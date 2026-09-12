<script lang="ts">
  import { onMount } from 'svelte';
  import { Check, KeyRound, LoaderCircle, Network, Plus, RefreshCw, Trash2, X } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { api } from '$lib/api';
  import type { GeminiApiKey, ProxyEndpoint } from '$lib/types';

  let keys: GeminiApiKey[] = [];
  let label = 'Personal Gemini key';
  let apiKey = '';
  let loading = true;
  let saving = false;
  let error = '';
  let notice = '';
  let testingId = '';
  let isAdmin = false;
  let proxies: ProxyEndpoint[] = [];
  let proxyLabel = 'Free proxy';
  let proxyUrl = '';
  let proxySaving = false;
  let proxyTestingId = '';
  let proxyValidating = false;

  async function loadKeys() {
    loading = true; error = '';
    try { keys = await api.listGeminiKeys(); }
    catch (err) { error = err instanceof Error ? err.message : 'Gemini keys tidak dapat dimuat'; }
    finally { loading = false; }
  }

  async function addKey() {
    if (!apiKey.trim()) { error = 'API key wajib diisi'; return; }
    saving = true; error = ''; notice = '';
    try { await api.createGeminiKey({ label, apiKey }); apiKey = ''; notice = 'Gemini API key tersimpan dengan aman.'; await loadKeys(); }
    catch (err) { error = err instanceof Error ? err.message : 'API key tidak dapat disimpan'; }
    finally { saving = false; }
  }

  async function testKey(id: string) {
    testingId = id; error = ''; notice = '';
    try { await api.testGeminiKey(id); notice = 'API key berhasil diuji.'; await loadKeys(); }
    catch (err) { error = err instanceof Error ? err.message : 'API key test gagal'; await loadKeys(); }
    finally { testingId = ''; }
  }

  async function toggleKey(item: GeminiApiKey) {
    error = ''; notice = '';
    try { await api.setGeminiKeyStatus(item.id, item.status === 'active' ? 'disabled' : 'active'); await loadKeys(); }
    catch (err) { error = err instanceof Error ? err.message : 'Status key tidak dapat diubah'; }
  }

  async function removeKey(item: GeminiApiKey) {
    if (!confirm(`Hapus ${item.label}? API key tidak dapat dipulihkan.`)) return;
    error = ''; notice = '';
    try { await api.deleteGeminiKey(item.id); notice = 'API key dihapus.'; await loadKeys(); }
    catch (err) { error = err instanceof Error ? err.message : 'API key tidak dapat dihapus'; }
  }

  async function loadProxies() {
    proxies = await api.listProxies();
  }

  async function removeAllProxies() {
    if (!proxies.length) return;
    if (!confirm('Hapus SEMUA proxy? Tindakan ini tidak dapat dibatalkan.')) return;
    if (!confirm('Konfirmasi lagi: seluruh daftar proxy akan dihapus permanen.')) return;
    proxyValidating = true; error = ''; notice = '';
    try {
      const result = await api.deleteAllProxies();
      proxies = [];
      notice = result.deleted + ' proxy dihapus.';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Semua proxy tidak dapat dihapus';
    } finally {
      proxyValidating = false;
    }
  }

  async function loadSettings() {
    await loadKeys();
    try {
      isAdmin = (await api.getAuthMe()).isAdmin;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Status admin tidak dapat dimuat';
      return;
    }
    if (isAdmin) {
      try {
        await loadProxies();
      } catch (err) {
        error = err instanceof Error ? err.message : 'Proxy list tidak dapat dimuat';
      }
    }
  }

  async function addProxy() {
    if (!proxyUrl.trim()) { error = 'Proxy URL wajib diisi'; return; }
    proxySaving = true; error = ''; notice = '';
    try {
      const result = await api.createProxyBatch({ label: proxyLabel, proxyUrl });
      proxyUrl = '';
      proxies = [...proxies, ...result.created];
      notice = result.created.length + ' proxy tersimpan.' + (result.rejected.length ? ' ' + result.rejected.length + ' baris ditolak.' : '');
      if (result.rejected.length) {
        error = result.rejected.map((item) => item.value + ': ' + item.reason).join(' | ');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Proxy tidak dapat disimpan';
    } finally {
      proxySaving = false;
    }
  }

  async function testProxy(id: string) {
    proxyTestingId = id; error = ''; notice = '';
    try {
      const result = await api.testProxy(id);
      proxies = proxies.map((item) => item.id === id ? result.proxy : item);
      if (result.ok) notice = 'Proxy berhasil: ' + (result.statusCode ?? 'unknown') + ' ' + result.pageTitle;
      else error = result.message;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Proxy test gagal';
      await loadProxies();
    } finally {
      proxyTestingId = '';
    }
  }

  async function validateProxies() {
    if (!confirm('Test semua proxy aktif dan hapus yang gagal?')) return;
    proxyValidating = true; error = ''; notice = '';
    try {
      const result = await api.validateProxies();
      notice = result.checked + ' proxy diuji: ' + result.validCount + ' valid, ' + result.removedCount + ' dihapus.';
      await loadProxies();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Validasi proxy gagal';
    } finally {
      proxyValidating = false;
    }
  }

  async function toggleProxy(item: ProxyEndpoint) {
    error = ''; notice = '';
    try {
      await api.setProxyStatus(item.id, item.status === 'active' ? 'disabled' : 'active');
      await loadProxies();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Status proxy tidak dapat diubah';
    }
  }

  async function removeProxy(item: ProxyEndpoint) {
    if (!confirm('Hapus ' + item.label + ' (' + item.displayUrl + ')?')) return;
    error = ''; notice = '';
    try {
      await api.deleteProxy(item.id);
      notice = 'Proxy dihapus.';
      await loadProxies();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Proxy tidak dapat dihapus';
    }
  }

  onMount(loadSettings);
</script>

<svelte:head><title>Gemini settings — StockScope</title></svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
  <div class="flex items-end justify-between gap-4"><div><p class="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">Personal AI</p><h1 class="text-2xl font-semibold tracking-tight">Gemini API keys</h1><p class="mt-1 text-sm text-slate-500">Gunakan quota Gemini milik Anda untuk membuat rekomendasi research.</p></div><Button variant="outline" size="sm" on:click={loadKeys} disabled={loading}><RefreshCw size={14} class={loading ? 'animate-spin' : ''} /> Refresh</Button></div>
  {#if error}<div class="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><X size={15} />{error}</div>{/if}
  {#if notice}<div class="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"><Check size={15} />{notice}</div>{/if}
  <Card className="p-5"><div class="flex items-center gap-2"><KeyRound size={16} class="text-cyan-300" /><h2 class="text-sm font-medium">Add API key</h2></div><p class="mt-2 text-xs leading-5 text-slate-500">Key dienkripsi di backend dan tidak pernah dikembalikan ke browser atau ditulis ke log.</p><form class="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" on:submit|preventDefault={addKey}><label class="space-y-1.5 text-xs text-slate-400"><span>Label</span><Input bind:value={label} placeholder="Personal key" /></label><label class="space-y-1.5 text-xs text-slate-400"><span>Gemini API key</span><Input bind:value={apiKey} type="password" placeholder="Paste your Gemini API key" /></label><Button type="submit" disabled={saving}><Plus size={15} />{saving ? 'Saving…' : 'Add key'}</Button></form></Card>
  <Card><div class="border-b border-slate-800 px-5 py-4"><h2 class="text-sm font-medium">Your keys</h2><p class="mt-1 text-xs text-slate-500">Hanya key milik akun Anda yang ditampilkan.</p></div>{#if loading}<div class="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500"><LoaderCircle size={16} class="animate-spin" /> Loading keys…</div>{:else if !keys.length}<div class="px-5 py-12 text-center text-sm text-slate-500">Belum ada Gemini API key.</div>{:else}<div class="divide-y divide-slate-800/70">{#each keys as item}<div class="flex flex-wrap items-center gap-3 px-5 py-4"><div class="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-cyan-300"><KeyRound size={15} /></div><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-slate-200">{item.label}</p><p class="mt-1 font-mono text-[11px] text-slate-500">••••{item.keyHint}</p></div><Badge tone={item.status === 'active' ? 'success' : 'muted'}>{item.status}</Badge>{#if item.failureCount}<span class="text-[11px] text-amber-300">{item.failureCount} failures</span>{/if}<div class="flex gap-2"><Button variant="outline" size="sm" on:click={() => testKey(item.id)} disabled={testingId === item.id}>{testingId === item.id ? 'Testing…' : 'Test'}</Button><Button variant="ghost" size="sm" on:click={() => toggleKey(item)}>{item.status === 'active' ? 'Disable' : 'Enable'}</Button><Button variant="ghost" size="icon" ariaLabel="Delete key" on:click={() => removeKey(item)}><Trash2 size={15} class="text-red-300" /></Button></div></div>{/each}</div>{/if}</Card>
  {#if isAdmin}
    <Card className="p-5">
      <div class="flex items-center gap-2"><Network size={16} class="text-cyan-300" /><h2 class="text-sm font-medium">Adobe proxy list</h2></div>
      <p class="mt-2 text-xs leading-5 text-slate-500">Proxy dipakai bergiliran oleh crawler backend. URL dan kredensial disimpan terenkripsi; hanya host dan port yang ditampilkan.</p>
      <form class="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" on:submit|preventDefault={addProxy}>
        <label class="space-y-1.5 text-xs text-slate-400"><span>Label</span><Input bind:value={proxyLabel} placeholder="Free proxy 1" /></label>
        <label class="space-y-1.5 text-xs text-slate-400"><span>Proxy URL (satu per baris)</span><textarea bind:value={proxyUrl} rows="2" class="min-h-9 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400" placeholder="http://host:port&#10;http://host:port"></textarea></label>
        <Button type="submit" disabled={proxySaving}><Plus size={15} />{proxySaving ? 'Saving...' : 'Add proxy'}</Button>
      </form>
      <p class="mt-3 text-[11px] text-amber-300/80">Free proxy sering timeout atau sudah diblokir. Test satu per satu sebelum mengaktifkan.</p>
    </Card>
    <Card>
      <div class="border-b border-slate-800 px-5 py-4"><h2 class="text-sm font-medium">Configured proxies</h2><p class="mt-1 text-xs text-slate-500">Proxy aktif akan digunakan untuk research berikutnya.</p></div>
      <div class="flex justify-end gap-2 border-b border-slate-800/70 px-5 py-3"><Button variant="outline" size="sm" on:click={validateProxies} disabled={proxyValidating || !proxies.length}>{proxyValidating ? 'Validating...' : 'Validate & remove invalid'}</Button><Button variant="ghost" size="sm" on:click={removeAllProxies} disabled={proxyValidating || !proxies.length}>Delete all</Button></div>
      {#if !proxies.length}
        <div class="px-5 py-10 text-center text-sm text-slate-500">Belum ada proxy.</div>
      {:else}
        <div class="divide-y divide-slate-800/70">
          {#each proxies as item}
            <div class="flex flex-wrap items-center gap-3 px-5 py-4">
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-cyan-300"><Network size={15} /></div>
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-slate-200">{item.label}</p><p class="mt-1 font-mono text-[11px] text-slate-500">{item.displayUrl}</p></div>
              <Badge tone={item.status === 'active' ? 'success' : 'muted'}>{item.status}</Badge>
              {#if item.lastTestOk === true}<span class="text-[11px] text-emerald-300">test ok</span>{:else if item.lastTestOk === false}<span class="text-[11px] text-red-300">{item.failureCount} failures</span>{/if}
              <div class="flex gap-2"><Button variant="outline" size="sm" on:click={() => testProxy(item.id)} disabled={proxyTestingId === item.id}>{proxyTestingId === item.id ? 'Testing...' : 'Test Adobe'}</Button><Button variant="ghost" size="sm" on:click={() => toggleProxy(item)}>{item.status === 'active' ? 'Disable' : 'Enable'}</Button><Button variant="ghost" size="icon" ariaLabel="Delete proxy" on:click={() => removeProxy(item)}><Trash2 size={15} class="text-red-300" /></Button></div>
              {#if item.lastError}<p class="basis-full text-[11px] text-red-300/80">{item.lastError}</p>{/if}
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {/if}
</div>
