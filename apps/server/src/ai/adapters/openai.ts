import { CONFIG } from '../../config.js';
import { AssessmentContext, StructuredRecommendation } from '../types.js';

export async function assessWithOpenAI(ctx: AssessmentContext): Promise<StructuredRecommendation> {
  const start = Date.now();
  const apiKey = CONFIG.AI.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const systemPrompt = `You are the Holdfast AI Risk & Assessment Engine on OpenAI.
You analyze proposed payment actions and explain risks in plain language.
Output strictly valid JSON with this structure:
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
AI cannot override deterministic payment policies.`;

  const userPrompt = `Contract: ${ctx.contractId}
Milestone: ${ctx.title} (${ctx.milestoneId})
Amount: ${ctx.currency} ${ctx.amount}
Deterministic Passed: ${ctx.deterministicPassed}
Deterministic Errors: ${JSON.stringify(ctx.deterministicErrors || [])}
Deliverable Payload:
${JSON.stringify(ctx.deliverablePayload || {}, null, 2)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 150)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  const parsed = JSON.parse(content);
  const latencyMs = Date.now() - start;

  return {
    summary: parsed.summary || 'OpenAI transaction analysis completed',
    severity: parsed.severity || (ctx.deterministicPassed ? 'low' : 'high'),
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    recommendedAction: parsed.recommendedAction || (ctx.deterministicPassed ? 'PERMIT' : 'REJECT'),
    requiresHumanReview: Boolean(parsed.requiresHumanReview),
    evidenceReferences: Array.isArray(parsed.evidenceReferences) ? parsed.evidenceReferences : [`milestone:${ctx.milestoneId}`],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : ['This assessment is advisory and does not prove real-world fulfillment.'],
    provider: 'openai',
    modelUsed: 'gpt-4o-mini',
    isLiveModel: true,
    isFallback: false,
    latencyMs,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.94,
    timestamp: new Date().toISOString(),
  };
}
