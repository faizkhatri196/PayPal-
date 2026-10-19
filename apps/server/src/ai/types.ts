export type AiProviderName = 'gemini' | 'groq' | 'openai';

export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecommendedAction = 'PERMIT' | 'REJECT' | 'REVIEW_REQUIRED';

export interface Finding {
  code: string;
  explanation: string;
}

export interface StructuredRecommendation {
  summary: string;
  severity: RecommendationSeverity;
  findings: Finding[];
  recommendedAction: RecommendedAction;
  requiresHumanReview: boolean;
  evidenceReferences: string[];
  limitations: string[];
  provider: AiProviderName | 'heuristic-fallback';
  modelUsed: string;
  isLiveModel: boolean;
  isFallback: boolean;
  latencyMs: number;
  confidence: number;
  timestamp: string;
}

export interface AssessmentContext {
  contractId: string;
  milestoneId: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  deliverablePayload?: any;
  deterministicPassed: boolean;
  deterministicErrors?: string[];
  auditHistory?: string[];
}

export interface ModelComparisonResult {
  contractId: string;
  milestoneId: string;
  timestamp: string;
  assessments: Record<AiProviderName, {
    configured: boolean;
    recommendation?: StructuredRecommendation;
    error?: string;
  }>;
  consensus: boolean;
  consensusAction: RecommendedAction;
  disagreementSummary?: string;
}
