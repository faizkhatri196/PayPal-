import { CONFIG } from '../config.js';
import {
  AiProviderName,
  AssessmentContext,
  StructuredRecommendation,
  ModelComparisonResult,
  RecommendedAction,
} from './types.js';
import { assessWithGemini } from './adapters/gemini.js';
import { assessWithGroq } from './adapters/groq.js';
import { assessWithOpenAI } from './adapters/openai.js';

// Fast local deterministic heuristic fallback when no LLM credentials are set or network drops
function generateHeuristicRecommendation(ctx: AssessmentContext): StructuredRecommendation {
  const findings = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let recommendedAction: RecommendedAction = 'PERMIT';
  let requiresHumanReview = false;

  if (!ctx.deterministicPassed) {
    severity = 'high';
    recommendedAction = 'REJECT';
    for (const err of ctx.deterministicErrors || ['Deterministic schema verification failure']) {
      findings.push({
        code: 'DETERMINISTIC_ASSERTION_FAILED',
        explanation: err,
      });
    }
  }

  // Check deliverable for potential injection or anomalies
  const serialized = JSON.stringify(ctx.deliverablePayload || {});
  if (/ignore\s+(all\s+)?(previous|prior)\s+instructions/i.test(serialized) || /system\s*:\s*override/i.test(serialized)) {
    severity = 'critical';
    recommendedAction = 'REJECT';
    findings.push({
      code: 'PROMPT_INJECTION_DETECTED',
      explanation: 'Payload contains instructions attempting to override validation rules.',
    });
  }

  const amountNum = parseFloat(ctx.amount) || 0;
  if (amountNum > 100) {
    requiresHumanReview = true;
    if (recommendedAction === 'PERMIT') {
      recommendedAction = 'REVIEW_REQUIRED';
    }
    findings.push({
      code: 'HIGH_VALUE_THRESHOLD',
      explanation: `Transaction amount exceeds $100.00 standard threshold, requesting human operator sign-off.`,
    });
  }

  return {
    summary: !ctx.deterministicPassed
      ? 'Deterministic policy checks failed. Operation must be rejected.'
      : severity === 'critical'
      ? 'Adversarial prompt injection pattern detected in deliverable.'
      : requiresHumanReview
      ? 'Deterministic rules passed; human operational approval required due to value tier.'
      : 'Deliverable adheres to contract schema, item thresholds, and positive pricing requirements.',
    severity,
    findings,
    recommendedAction,
    requiresHumanReview,
    evidenceReferences: [`milestone:${ctx.milestoneId}`, `hash:${ctx.contractId.slice(0, 8)}`],
    limitations: [
      'Heuristic evaluation rule. Cryptographic receipt validates payload integrity, not real-world utility.',
    ],
    provider: 'heuristic-fallback',
    modelUsed: 'deterministic-heuristic-v1',
    isLiveModel: false,
    isFallback: true,
    latencyMs: 1,
    confidence: 0.95,
    timestamp: new Date().toISOString(),
  };
}

export class AiIntelligenceService {
  private activeProvider: AiProviderName = (CONFIG.AI.PROVIDER as AiProviderName) || 'gemini';

  public getActiveProvider(): AiProviderName {
    return this.activeProvider;
  }

  public setActiveProvider(provider: AiProviderName) {
    this.activeProvider = provider;
  }

  public isProviderConfigured(provider: AiProviderName): boolean {
    switch (provider) {
      case 'gemini':
        return Boolean(CONFIG.AI.GEMINI_API_KEY);
      case 'groq':
        return Boolean(CONFIG.AI.GROQ_API_KEY);
      case 'openai':
        return Boolean(CONFIG.AI.OPENAI_API_KEY);
      default:
        return false;
    }
  }

  public getProvidersStatus() {
    return {
      activeProvider: this.activeProvider,
      providers: {
        gemini: {
          configured: Boolean(CONFIG.AI.GEMINI_API_KEY),
          model: 'gemini-2.5-flash',
        },
        groq: {
          configured: Boolean(CONFIG.AI.GROQ_API_KEY),
          model: 'qwen/qwen3.8-27b',
        },
        openai: {
          configured: Boolean(CONFIG.AI.OPENAI_API_KEY),
          model: 'gpt-4o-mini',
        },
      },
    };
  }

  public async getRecommendation(
    ctx: AssessmentContext,
    targetProvider?: AiProviderName
  ): Promise<StructuredRecommendation> {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    if (isTest && !process.env.TEST_LIVE_AI) {
      const rec = generateHeuristicRecommendation(ctx);
      if (targetProvider) {
        rec.provider = targetProvider;
        rec.modelUsed = targetProvider === 'gemini' ? 'gemini-2.5-flash' : targetProvider === 'groq' ? 'qwen/qwen3.8-27b' : 'gpt-4o-mini';
      }
      return rec;
    }

    const providerToUse = targetProvider || this.activeProvider;

    // Fast-path: if deterministic check already failed, fail closed
    if (!ctx.deterministicPassed) {
      return generateHeuristicRecommendation(ctx);
    }

    try {
      if (providerToUse === 'gemini' && CONFIG.AI.GEMINI_API_KEY) {
        return await assessWithGemini(ctx);
      }
      if (providerToUse === 'groq' && CONFIG.AI.GROQ_API_KEY) {
        return await assessWithGroq(ctx);
      }
      if (providerToUse === 'openai' && CONFIG.AI.OPENAI_API_KEY) {
        return await assessWithOpenAI(ctx);
      }
    } catch (err: any) {
      console.warn(`[AI Service] Error calling ${providerToUse}: ${err.message}. Falling back to heuristic.`);
    }

    return generateHeuristicRecommendation(ctx);
  }

  public async compareModels(ctx: AssessmentContext): Promise<ModelComparisonResult> {
    const providers: AiProviderName[] = ['gemini', 'groq', 'openai'];
    const assessments: Record<AiProviderName, any> = {
      gemini: { configured: Boolean(CONFIG.AI.GEMINI_API_KEY) },
      groq: { configured: Boolean(CONFIG.AI.GROQ_API_KEY) },
      openai: { configured: Boolean(CONFIG.AI.OPENAI_API_KEY) },
    };

    const promises = providers.map(async (provider) => {
      try {
        if (this.isProviderConfigured(provider)) {
          const rec = await this.getRecommendation(ctx, provider);
          assessments[provider].recommendation = rec;
        } else {
          // Provide local simulation assessment for demonstration
          const simulatedRec = generateHeuristicRecommendation(ctx);
          simulatedRec.provider = provider;
          simulatedRec.modelUsed =
            provider === 'gemini' ? 'gemini-2.5-flash (demo)' : provider === 'groq' ? 'qwen/qwen3.8-27b (demo)' : 'gpt-4o-mini (demo)';
          simulatedRec.isLiveModel = false;
          simulatedRec.isFallback = true;
          assessments[provider].recommendation = simulatedRec;
        }
      } catch (err: any) {
        assessments[provider].error = err.message;
      }
    });

    await Promise.all(promises);

    // Compute consensus
    const actions: RecommendedAction[] = [];
    for (const p of providers) {
      const rec = assessments[p]?.recommendation;
      if (rec?.recommendedAction) {
        actions.push(rec.recommendedAction);
      }
    }

    const allAgree = actions.length > 0 && actions.every((a) => a === actions[0]);
    const consensusAction = allAgree ? actions[0] : 'REVIEW_REQUIRED';

    let disagreementSummary: string | undefined = undefined;
    if (!allAgree) {
      disagreementSummary = `Models disagreed on risk level: actions proposed were ${actions.join(', ')}. Triggering human review requirement.`;
    }

    return {
      contractId: ctx.contractId,
      milestoneId: ctx.milestoneId,
      timestamp: new Date().toISOString(),
      assessments,
      consensus: allAgree,
      consensusAction,
      disagreementSummary,
    };
  }
}

export const aiIntelligenceService = new AiIntelligenceService();
