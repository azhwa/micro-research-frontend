export type AssetType = 'images' | 'videos';
export type ResearchMode = 'fast' | 'full';
export type RunStatus = 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled';
export type SortMode = 'downloads' | 'relevance' | 'recent';

export interface ResearchRun {
  id: string;
  seedKeyword: string;
  category: string;
  assetType: AssetType;
  locale: string;
  maxSuggestions: number;
  assetsPerQuery: number;
  autocompleteEnabled: boolean;
  mode: ResearchMode;
  status: RunStatus;
  progressTotal: number;
  progressCompleted: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ResearchResult {
  observationId: string;
  assetId: string;
  externalId: string;
  assetType: AssetType;
  title: string;
  assetUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  isPremium: boolean;
  query: string;
  sortMode: SortMode;
  rank: number;
  observedAt: string;
}

export interface ResearchKeyword {
  id: string;
  assetId: string;
  externalId: string;
  title: string;
  keyword: string;
  normalizedKeyword: string;
  source: string;
  position: number;
  observedAt: string;
}

export interface RunCreated { id: string; jobId: string; status: RunStatus; }

export interface ResearchEvent {
  id: string;
  researchRunId: string;
  level: 'info' | 'success' | 'warning' | 'error';
  eventType: string;
  message: string;
  metadataJson: string | null;
  createdAt: string;
}

export interface KeywordOpportunity {
  keyword: string;
  normalizedKeyword: string;
  source: string;
  autocompletePosition: number | null;
  suggestionFrequency: number;
  queryCount: number;
  assetCount: number;
  bestDownloadRank: number | null;
  averageDownloadRank: number | null;
  bestRecentRank: number | null;
  resultCount: number | null;
  demandScore: number;
  competitionScore: number;
  freshnessScore: number;
  consistencyScore: number;
  opportunityScore: number;
}

export interface AssetOpportunity {
  assetId: string;
  externalId: string;
  title: string;
  assetUrl: string;
  thumbnailUrl: string | null;
  assetType: string;
  width: number | null;
  height: number | null;
  isPremium: boolean;
  appearances: number;
  sortModes: string[];
  bestDownloadRank: number | null;
  bestRecentRank: number | null;
  bestRelevanceRank: number | null;
  keywordCount: number;
  assetScore: number;
}

export interface ResearchSummary {
  runId: string;
  scoringVersion: string;
  generatedAt: string;
  totals: {
    suggestions: number;
    queries: number;
    expectedQueries: number;
    uniqueAssets: number;
    keywords: number;
  };
  dataQuality: {
    queryCoveragePct: number;
    keywordCoveragePct: number;
    completenessScore: number;
    confidence: 'low' | 'medium' | 'high';
    warnings: string[];
    downloadsAssets: number;
    assetsWithKeywords: number;
    missingKeywordAssets: number;
    resultCountsAvailable: number;
  };
  scores: {
    demandScore: number;
    competitionScore: number;
    freshnessScore: number;
    consistencyScore: number;
    opportunityScore: number;
  };
  topKeywords: KeywordOpportunity[];
  topAssets: AssetOpportunity[];
}

export interface GlobalKeywordInsight {
  keyword: string;
  normalizedKeyword: string;
  assetTypes: string[];
  locales: string[];
  categories: string[];
  researchCount: number;
  snapshotCount: number;
  confidence: 'low' | 'medium' | 'high';
  trend: 'up' | 'stable' | 'down';
  averageOpportunityScore: number | null;
  globalOpportunityScore: number | null;
  averageDemandScore: number | null;
  averageCompetitionScore: number | null;
  averageFreshnessScore: number | null;
  averageConsistencyScore: number | null;
  averageDownloadRank: number | null;
  averageResultCount: number | null;
  assetCount: number;
  sources: string[];
  firstObservedAt: string;
  lastObservedAt: string;
}

export interface GlobalInsights {
  generatedAt: string;
  filters: { assetType: string; locale: string; category: string };
  totals: { researchRuns: number; keywords: number; snapshots: number };
  keywords: GlobalKeywordInsight[];
}

export interface ComparisonMetric { first: number; second: number; delta: number; }
export interface ResearchComparison {
  generatedAt: string;
  firstRun: Pick<ResearchRun, 'id' | 'seedKeyword' | 'category' | 'assetType' | 'locale' | 'status'>;
  secondRun: Pick<ResearchRun, 'id' | 'seedKeyword' | 'category' | 'assetType' | 'locale' | 'status'>;
  metrics: Record<'opportunityScore' | 'demandScore' | 'competitionScore' | 'freshnessScore' | 'completenessScore', ComparisonMetric>;
  assetOverlap: { shared: number; union: number; jaccardPct: number };
  keywordChanges: Array<{ keyword: string; normalizedKeyword: string; state: 'new' | 'lost' | 'changed' | 'stable'; firstScore: number | null; secondScore: number | null; delta: number | null; firstRank: number | null; secondRank: number | null; source: string }>;
  firstDataQuality: ResearchSummary['dataQuality'];
  secondDataQuality: ResearchSummary['dataQuality'];
}

export interface MonitoringSnapshot {
  generatedAt: string;
  worker: { concurrency: number; activeJobs: number; lastHeartbeatAt: string | null; staleThresholdMinutes: number; maxAttempts: number };
  runs: { sampled: number; byStatus: Record<string, number>; averageDurationSeconds: number | null };
  events: { sampled: number; byType: Record<string, number>; byLevel: Record<string, number> };
  scraper: { retries: number; recoveredJobs: number; partialRuns: number; keywordEnrichment: { success: number; empty: number; failed: number } };
}

export interface AuthMe {
  userId: string;
  sessionId: string | null;
  organizationId: string | null;
  organizationRole: string | null;
  isAdmin: boolean;
  isDevBypass: boolean;
}

export interface AiRecommendation {
  id: string;
  researchRunId: string | null;
  scope: string;
  promptVersion: string;
  model: string | null;
  inputHash: string;
  status: string;
  response: unknown;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface GeminiApiKey {
  id: string;
  label: string;
  keyHint: string;
  status: string;
  failureCount: number;
  cooldownUntil: string | null;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyEndpoint {
  id: string;
  label: string;
  displayUrl: string;
  status: string;
  failureCount: number;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}
