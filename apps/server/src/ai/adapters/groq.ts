import { CONFIG } from '../../config.js';
import { AssessmentContext, StructuredRecommendation } from '../types.js';

export async function assessWithGroq(ctx: AssessmentContext): Promise<StructuredRecommendation> {
  const start = Date.now();
  const apiKey = CONFIG.AI.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const systemPrompt = `You are the Holdfast AI Risk & Assessment Engine on Groq LPU.
Analyze the proposed payment operation and output strictly valid JSON conforming to:
{
  "summary": string,
  "severity": "low" | "medium" | "high" | "critical",
  "findings": [{"code": string, "explanation": string}],
  "recommendedAction": "PERMIT" | "REJECT" | "REVIEW_REQUIRED",
  "requiresHumanReview": boolean,
  "evidenceReferences": string[],
  "limitations": string[],
  "confidence": number
}
AI review cannot override deterministic security rejections.`;

  const userPrompt = `Contract ID: ${ctx.contractId}
Milestone: ${ctx.title} (${ctx.milestoneId})
Amount: ${ctx.currency} ${ctx.amount}
Deterministic Checks Passed: ${ctx.deterministicPassed}
Deterministic Errors: ${JSON.stringify(ctx.deterministicErrors || [])}
Deliverable Payload:
${JSON.stringify(ctx.deliverablePayload || {}, null, 2)}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText.slice(0, 150)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned empty response');
  }

  const parsed = JSON.parse(content);
  const latencyMs = Date.now() - start;

  return {
    summary: parsed.summary || 'Groq risk assessment generated',
    severity: parsed.severity || (ctx.deterministicPassed ? 'low' : 'high'),
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    recommendedAction: parsed.recommendedAction || (ctx.deterministicPassed ? 'PERMIT' : 'REJECT'),
    requiresHumanReview: Boolean(parsed.requiresHumanReview),
    evidenceReferences: Array.isArray(parsed.evidenceReferences) ? parsed.evidenceReferences : [`milestone:${ctx.milestoneId}`],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : ['This assessment is advisory and does not prove real-world fulfillment.'],
    provider: 'groq',
    modelUsed: 'qwen/qwen3.8-27b',
    isLiveModel: true,
    isFallback: false,
    latencyMs,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.89,
    timestamp: new Date().toISOString(),
  };
}
