import { env } from '$env/dynamic/public';
import type { AiRecommendation, AuthMe, GeminiApiKey, GlobalInsights, MonitoringSnapshot, ProxyEndpoint, ResearchComparison, ResearchEvent, ResearchKeyword, ResearchResult, ResearchRun, ResearchSummary, RunCreated } from './types';
import { getClerkToken } from './clerk';

const API_BASE = (env.PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getClerkToken();
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && init.body !== null) {
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? `Request gagal (${response.status})`);
  }
  return payload as T;
}

export const api = {
  base: API_BASE,
  getHealth: () => request<{ status: string }>('/api/health'),
  getAuthMe: () => request<AuthMe>('/api/auth/me'),
  listRuns: (limit = 20) => request<ResearchRun[]>(`/api/research-runs?limit=${limit}`),
  getRun: (id: string) => request<ResearchRun>(`/api/research-runs/${id}`),
  deleteResearchRun: (id: string) => request<{ deleted: boolean; researchRunId: string; orphanedAssets: number }>(`/api/research-runs/${id}`, { method: 'DELETE' }),
  getResults: (id: string, limit = 1000) => request<ResearchResult[]>(`/api/research-runs/${id}/results?limit=${limit}`),
  getKeywords: (id: string, limit = 1000) => request<ResearchKeyword[]>(`/api/research-runs/${id}/keywords?limit=${limit}`),
  getEvents: (id: string, limit = 100) => request<ResearchEvent[]>(`/api/research-runs/${id}/events?limit=${limit}`),
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
  getComparison: (firstRunId: string, secondRunId: string, limit = 100) => request<ResearchComparison>(`/api/research-comparisons?firstRunId=${encodeURIComponent(firstRunId)}&secondRunId=${encodeURIComponent(secondRunId)}&limit=${limit}`),
  getMonitoring: () => request<MonitoringSnapshot>('/api/monitoring'),
  listGeminiKeys: () => request<GeminiApiKey[]>('/api/gemini/keys'),
  createGeminiKey: (body: { label: string; apiKey: string }) => request<GeminiApiKey>('/api/gemini/keys', { method: 'POST', body: JSON.stringify(body) }),
  testGeminiKey: (id: string) => request<{ ok: boolean; response: string }>(`/api/gemini/keys/${id}/test`, { method: 'POST', body: JSON.stringify({}) }),
  setGeminiKeyStatus: (id: string, status: 'active' | 'disabled') => request<GeminiApiKey>(`/api/gemini/keys/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
 deleteGeminiKey: (id: string) => request<{ deleted: boolean }>(`/api/gemini/keys/${id}`, { method: 'DELETE' }),
 listProxies: () => request<ProxyEndpoint[]>('/api/proxies'),
  validateProxies: () => request<{ checked: number; validCount: number; removedCount: number; removed: Array<{ id: string; label: string; reason: string }> }>('/api/proxies/validate-all', { method: 'POST', body: JSON.stringify({}) }),
 createProxy: (body: { label: string; proxyUrl: string }) => request<ProxyEndpoint>('/api/proxies', { method: 'POST', body: JSON.stringify(body) }),
  testProxy: (id: string) => request<{ proxy: ProxyEndpoint; ok: boolean; statusCode: number | null; pageTitle: string; message: string }>(`/api/proxies/${id}/test`, { method: 'POST', body: JSON.stringify({}) }),
  setProxyStatus: (id: string, status: 'active' | 'disabled') => request<ProxyEndpoint>(`/api/proxies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteProxy: (id: string) => request<{ deleted: boolean }>(`/api/proxies/${id}`, { method: 'DELETE' }),
  generateAiRecommendation: (id: string, model = 'gemini-3.5-flash-lite') => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>(`/api/research-runs/${id}/ai-recommendations/generate`, { method: 'POST', body: JSON.stringify({ model }) }),
  generateGlobalAiRecommendation: (options: { model?: string; assetType?: string; locale?: string; category?: string } = {}) => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>('/api/ai-recommendations/global/generate', { method: 'POST', body: JSON.stringify(options) }),
  getGlobalAiRecommendations: (limit = 20) => request<AiRecommendation[]>(`/api/ai-recommendations/global?limit=${limit}`),
  prepareAiRecommendation: (id: string, model = 'gemini-3.5-flash-lite') => request<{ recommendation: AiRecommendation; context: Record<string, unknown> }>(`/api/research-runs/${id}/ai-recommendations/prepare`, { method: 'POST', body: JSON.stringify({ promptVersion: 'recommendation-v1', model }) }),
  getAiRecommendations: (id: string, limit = 20) => request<AiRecommendation[]>(`/api/research-runs/${id}/ai-recommendations?limit=${limit}`),
  createRun: (body: { keyword: string; category?: string; assetType: 'images' | 'videos'; locale: string; maxSuggestions: number; assetsPerQuery: number; mode: 'fast' | 'full' }) =>
    request<RunCreated>('/api/research-runs', { method: 'POST', body: JSON.stringify(body) }),
  cancelRun: (id: string) => request<ResearchRun>(`/api/research-runs/${id}/cancel`, { method: 'POST' })
};
