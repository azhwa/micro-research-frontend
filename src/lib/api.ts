import { env } from '$env/dynamic/public';
import type { AiRecommendation, AiReadoutType, AuthMe, GeminiApiKey, GlobalInsights, MonitoringSnapshot, PromptGeneration, PromptGenerationSet, PromptQueueItem, ProxyEndpoint, ResearchComparison, ResearchDetailLog, ResearchEvent, ResearchKeyword, ResearchQueueItem, ResearchResult, ResearchRun, ResearchSummary, RunCreated, SavedPrompt, SeedDiscoveryJob } from './types';

const API_BASE = (env.PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && init.body !== null) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? payload?.error ?? `Request gagal (${response.status})`,
      response.status
    );
  }
  return payload as T;
}

export const api = {
  base: API_BASE,
  getHealth: () => request<{ status: string }>('/api/health'),
  login: (body: { username: string; password: string }) => request<AuthMe>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
  getAuthMe: () => request<AuthMe>('/api/auth/me'),
  listRuns: (limit = 20) => request<ResearchRun[]>(`/api/research-runs?limit=${limit}`),
  listResearchQueue: (limit = 100) => request<ResearchQueueItem[]>(`/api/research-queue?limit=${limit}`),
  queueResearch: (body: { keyword: string; category?: string; assetType?: 'images' | 'videos'; locale?: string }) => request<ResearchQueueItem>('/api/research-queue', { method: 'POST', body: JSON.stringify(body) }),
  queueResearchBatch: (items: Array<{ keyword: string; category?: string; assetType?: 'images' | 'videos'; locale?: string }>) => request<{ created: ResearchQueueItem[]; duplicate: string[]; rejected: Array<{ keyword: string; reason: string }>; skipped: number }>('/api/research-queue/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  startResearchQueue: (id: string) => request<{ item: ResearchQueueItem | null; run: RunCreated | null }>(`/api/research-queue/${id}/start`, { method: 'POST', body: JSON.stringify({}) }),
  deleteResearchQueue: (id: string) => request<{ deleted: boolean; queueId: string }>(`/api/research-queue/${id}`, { method: 'DELETE' }),
  getRun: (id: string) => request<ResearchRun>(`/api/research-runs/${id}`),
  deleteResearchRun: (id: string) => request<{ deleted: boolean; researchRunId: string; orphanedAssets: number }>(`/api/research-runs/${id}`, { method: 'DELETE' }),
  getResults: (id: string, limit = 1000) => request<ResearchResult[]>(`/api/research-runs/${id}/results?limit=${limit}`),
  getKeywords: (id: string, limit = 1000) => request<ResearchKeyword[]>(`/api/research-runs/${id}/keywords?limit=${limit}`),
  getEvents: (id: string, limit = 100) => request<ResearchEvent[]>(`/api/research-runs/${id}/events?limit=${limit}`),
  getDetailLogs: (id: string, limit = 100) => request<ResearchDetailLog[]>(`/api/research-runs/${id}/detail-log?limit=${limit}`),
  getSummary: (id: string, limit = 20) => request<ResearchSummary>(`/api/research-runs/${id}/summary?limit=${limit}`),
  getKeywordOpportunities: (id: string, limit = 50) => request<ResearchSummary['topKeywords']>(`/api/research-runs/${id}/keyword-opportunities?limit=${limit}`),
  getTopAssets: (id: string, limit = 50) => request<ResearchSummary['topAssets']>(`/api/research-runs/${id}/top-assets?limit=${limit}`),
  getAiContext: (id: string) => request<Record<string, unknown>>(`/api/research-runs/${id}/ai-context`),
  getGlobalInsights: (options: { assetType?: string; locale?: string; category?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.assetType) params.set('assetType', options.assetType);
    if (options.locale) params.set('locale', options.locale);
    if (options.category) params.set('category', options.category);
    params.set('limit', String(options.limit ?? 100));
    return request<GlobalInsights>(`/api/insights?${params.toString()}`);
  },
  getGlobalExportUrl: (options: { assetType?: string; locale?: string; category?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.assetType) params.set('assetType', options.assetType);
    if (options.locale) params.set('locale', options.locale);
    if (options.category) params.set('category', options.category);
    return `${API_BASE}/api/insights/export.csv?${params.toString()}`;
  },
  createSeedDiscovery: (body: { topic?: string; category?: string; assetType?: string; locale?: string; count?: number; model?: string }) => request<SeedDiscoveryJob>('/api/seed-discovery', { method: 'POST', body: JSON.stringify(body) }),
  listSeedDiscoveryJobs: (limit = 20) => request<SeedDiscoveryJob[]>(`/api/seed-discovery?limit=${limit}`),
  getSeedDiscoveryJob: (id: string) => request<SeedDiscoveryJob>(`/api/seed-discovery/${id}`),
  cancelSeedDiscoveryJob: (id: string) => request<SeedDiscoveryJob>(`/api/seed-discovery/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) }),
  generatePrompts: (body: { seed: string; researchRunId?: string; category?: string; assetType?: string; locale?: string; count?: number; style?: string; model?: string; generationSeed?: string; generateAnother?: boolean }) => request<{ generation: PromptGeneration; context: Record<string, unknown> }>('/api/prompt-generations', { method: 'POST', body: JSON.stringify(body) }),
  listPromptQueue: (limit = 100) => request<PromptQueueItem[]>(`/api/prompt-queue?limit=${limit}`),
  queuePrompts: (items: Array<{ keyword: string; category?: string; researchAssetType?: 'images' | 'videos'; promptOutputType?: 'image' | 'video'; locale?: string; promptCount?: number; recommendedStyle?: string; styleRationale?: string; sourceReadoutId?: string; sourceScore?: number; sourceLevel?: number; sourceConfidence?: 'low' | 'medium' | 'high'; sourceEvidence?: string[]; sourceObservedAt?: string | null }>) => request<{ created: PromptQueueItem[]; duplicate: string[]; rejected: Array<{ keyword: string; reason: string }>; skipped: number }>('/api/prompt-queue/batch', { method: 'POST', body: JSON.stringify({ items }) }),
  updatePromptQueue: (id: string, body: { promptCount?: number; promptOutputType?: 'image' | 'video'; recommendedStyle?: string }) => request<PromptQueueItem>(`/api/prompt-queue/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  generatePromptQueue: (id: string, confirmLowConfidence = false) => request<{ item: PromptQueueItem; result: { generation: PromptGeneration; context: Record<string, unknown> } | null }>(`/api/prompt-queue/${id}/generate`, { method: 'POST', body: JSON.stringify({ confirmLowConfidence }) }),
  deletePromptQueue: (id: string) => request<{ deleted: boolean; queueId: string }>(`/api/prompt-queue/${id}`, { method: 'DELETE' }),
  cancelPromptQueue: (id: string) => request<PromptQueueItem>(`/api/prompt-queue/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) }),
  listSavedPrompts: (limit = 100) => request<SavedPrompt[]>(`/api/prompts?limit=${limit}`),
  deleteSavedPrompt: (id: string) => request<{ deleted: boolean; promptId: string }>(`/api/prompts/${id}`, { method: 'DELETE' }),
  listPromptLibrary: (limit = 100) => request<PromptGenerationSet[]>(`/api/prompt-library?limit=${limit}`),
  getPromptLibrarySet: (generationId: string, limit = 50, offset = 0) => request<PromptGenerationSet>(`/api/prompt-library/${encodeURIComponent(generationId)}?limit=${limit}&offset=${offset}`),
  deletePromptGenerationSet: (generationId: string) => request<{ deleted: boolean; generationId: string; promptCount: number }>(`/api/prompt-library/${generationId}`, { method: 'DELETE' }),
  downloadPromptExport: async (format: 'csv' | 'txt', generationId?: string): Promise<void> => {
    const params = generationId ? `?generationId=${encodeURIComponent(generationId)}` : '';
    const response = await fetch(`${API_BASE}/api/prompts/export.${format}${params}`, { credentials: 'include' });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(payload?.message ?? payload?.error ?? `Export gagal (${response.status})`, response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stockscope-prompts.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  getComparison: (firstRunId: string, secondRunId: string, limit = 100) => request<ResearchComparison>(`/api/research-comparisons?firstRunId=${encodeURIComponent(firstRunId)}&secondRunId=${encodeURIComponent(secondRunId)}&limit=${limit}`),
  getMonitoring: () => request<MonitoringSnapshot>('/api/monitoring'),
  listGeminiKeys: () => request<GeminiApiKey[]>('/api/gemini/keys'),
  createGeminiKey: (body: { label: string; apiKey: string }) => request<GeminiApiKey>('/api/gemini/keys', { method: 'POST', body: JSON.stringify(body) }),
  testGeminiKey: (id: string) => request<{ ok: boolean; response: string }>(`/api/gemini/keys/${id}/test`, { method: 'POST', body: JSON.stringify({}) }),
  setGeminiKeyStatus: (id: string, status: 'active' | 'disabled') => request<GeminiApiKey>(`/api/gemini/keys/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
 deleteGeminiKey: (id: string) => request<{ deleted: boolean }>(`/api/gemini/keys/${id}`, { method: 'DELETE' }),
 listProxies: () => request<ProxyEndpoint[]>('/api/proxies'),
  validateProxies: () => request<{ checked: number; validCount: number; removedCount: number; removed: Array<{ id: string; label: string; reason: string }> }>('/api/proxies/validate-all', { method: 'POST', body: JSON.stringify({}) }),
  createProxy: (body: { label: string; proxyUrl?: string; protocol?: string; host?: string; port?: string; username?: string; password?: string }) => request<ProxyEndpoint>('/api/proxies', { method: 'POST', body: JSON.stringify(body) }),
  createProxyBatch: (body: { label: string; proxyUrl: string }) => request<{ created: ProxyEndpoint[]; rejected: Array<{ value: string; reason: string }>; total: number }>('/api/proxies/batch', { method: 'POST', body: JSON.stringify(body) }),
  testProxy: (id: string) => request<{ proxy: ProxyEndpoint; ok: boolean; statusCode: number | null; pageTitle: string; pageUsable: boolean; assetCount: number; challengeDetected: boolean; message: string }>(`/api/proxies/${id}/test`, { method: 'POST', body: JSON.stringify({}) }),
  setProxyStatus: (id: string, status: 'active' | 'disabled') => request<ProxyEndpoint>(`/api/proxies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
 deleteProxy: (id: string) => request<{ deleted: boolean }>(`/api/proxies/${id}`, { method: 'DELETE' }),
  deleteAllProxies: () => request<{ deleted: number }>('/api/proxies', { method: 'DELETE' }),
  generateAiRecommendation: (id: string, model = 'gemini-3.5-flash-lite') => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>(`/api/research-runs/${id}/ai-recommendations/generate`, { method: 'POST', body: JSON.stringify({ model }) }),
  generateGlobalAiRecommendation: (options: { model?: string; assetType?: string; locale?: string; category?: string } = {}) => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>('/api/ai-recommendations/global/generate', { method: 'POST', body: JSON.stringify(options) }),
  getGlobalAiRecommendations: (limit = 20) => request<AiRecommendation[]>(`/api/ai-recommendations/global?limit=${limit}`),
  generateAiReadout: (type: AiReadoutType, options: { model?: string; assetType?: string; locale?: string; category?: string; generationSeed?: string; generateAnother?: boolean } = {}) => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>('/api/ai-readouts/global/generate', { method: 'POST', body: JSON.stringify({ ...options, type }) }),
  getAiReadouts: (type: AiReadoutType, options: { limit?: number; assetType?: string; locale?: string; category?: string } = {}) => {
    const params = new URLSearchParams({ type, limit: String(options.limit ?? 20) });
    if (options.assetType) params.set('assetType', options.assetType);
    if (options.locale) params.set('locale', options.locale);
    if (options.category) params.set('category', options.category);
    return request<AiRecommendation[]>(`/api/ai-readouts/global?${params.toString()}`);
  },
  downloadAiReadoutExport: async (type: AiReadoutType, format: 'csv' | 'txt', options: { assetType?: string; locale?: string; category?: string } = {}): Promise<void> => {
    const params = new URLSearchParams({ type });
    if (options.assetType) params.set('assetType', options.assetType);
    if (options.locale) params.set('locale', options.locale);
    if (options.category) params.set('category', options.category);
    const response = await fetch(`${API_BASE}/api/ai-readouts/global/export.${format}?${params.toString()}`, { credentials: 'include' });
    if (!response.ok) throw new ApiError(`Export ${type} gagal (${response.status})`, response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stockscope-${type}-readout.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  prepareAiRecommendation: (id: string, model = 'gemini-3.5-flash-lite') => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>(`/api/research-runs/${id}/ai-recommendations/prepare`, { method: 'POST', body: JSON.stringify({ promptVersion: 'recommendation-v1', model }) }),
  getAiRecommendations: (id: string, limit = 20) => request<AiRecommendation[]>(`/api/research-runs/${id}/ai-recommendations?limit=${limit}`),
  createRun: (body: { keyword: string; category?: string; assetType: 'images' | 'videos'; locale: string; maxSuggestions: number; assetsPerQuery: number; autocompleteEnabled: boolean; mode: 'fast' | 'full' | 'primary' }) =>
    request<RunCreated>('/api/research-runs', { method: 'POST', body: JSON.stringify(body) }),
  cancelRun: (id: string) => request<ResearchRun>(`/api/research-runs/${id}/cancel`, { method: 'POST' }),
  connectResearchStream: (id: string, onEvent: (event: string, payload: unknown) => void) => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/research-runs/${id}/stream`, {
          headers: { accept: 'text/event-stream' },
          credentials: 'include',
          signal: controller.signal
        });
        if (!response.ok) {
          onEvent('error', { status: response.status });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buffer = '';
        let eventName = 'message';
        let dataLines: string[] = [];

        const dispatch = () => {
          if (!dataLines.length) return;
          const raw = dataLines.join('\n');
          let payload: unknown = raw;
          try { payload = JSON.parse(raw); } catch { /* Keep plain SSE data. */ }
          onEvent(eventName, payload);
          eventName = 'message';
          dataLines = [];
        };

        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line) { dispatch(); continue; }
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
        }
        dispatch();
        if (!controller.signal.aborted) onEvent('close', null);
      } catch (error) {
        if (!controller.signal.aborted) onEvent('error', error);
      }
    })();
    return controller;
  }
};
