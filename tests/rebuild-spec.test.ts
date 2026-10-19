import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../apps/server/src/db/store.js';
import { aiIntelligenceService } from '../apps/server/src/ai/service.js';

describe('Holdfast Advanced Rebuild Specification Suite', () => {
  beforeEach(() => {
    db.clear();
    db.seedInitialData();
  });

  describe('1. Transaction Explorer AG Grid Backend Serialization', () => {
    it('generates rich, structured transaction records suitable for AG Grid Community', () => {
      const txns = db.getAllTransactions();
      expect(txns.length).toBeGreaterThan(0);

      const first = txns[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('provider', 'PayPal Sandbox');
      expect(first).toHaveProperty('amount');
      expect(first).toHaveProperty('currency', 'USD');
      expect(first).toHaveProperty('payment_state');
      expect(first).toHaveProperty('verification');
      expect(first).toHaveProperty('risk');
      expect(first).toHaveProperty('ai_assessment');
      expect(first).toHaveProperty('reconciliation');
      expect(first).toHaveProperty('details');
      expect(first.details).toHaveProperty('buyer_agent_id');
      expect(first.details).toHaveProperty('worker_agent_id');
    });

    it('accurately distinguishes settled captures from pre-authorization holds', () => {
      const txns = db.getAllTransactions();
      const captured = txns.find((t) => t.payment_state === 'Captured');
      const held = txns.find((t) => t.payment_state === 'Held' || t.payment_state === 'Authorized');

      expect(captured).toBeDefined();
      expect(captured?.details.paypal_capture_id).toBeDefined();
      expect(held).toBeDefined();
    });
  });

  describe('2. Multi-Provider AI Architecture & Structured Recommendations', () => {
    it('generates structured recommendations conforming to the specification schema', async () => {
      const rec = await aiIntelligenceService.getRecommendation({
        contractId: 'ct_test_ai',
        milestoneId: 'ms_test_01',
        title: 'Competitor Price Index',
        description: 'Collect SKU prices from 5 retailers',
        amount: '15.00',
        currency: 'USD',
        deliverablePayload: {
          items: [{ sku: 'SKU-1', price: 15.0 }],
        },
        deterministicPassed: true,
      });

      expect(rec).toHaveProperty('summary');
      expect(rec).toHaveProperty('severity');
      expect(['low', 'medium', 'high', 'critical']).toContain(rec.severity);
      expect(rec).toHaveProperty('findings');
      expect(Array.isArray(rec.findings)).toBe(true);
      expect(rec).toHaveProperty('recommendedAction');
      expect(['PERMIT', 'REJECT', 'REVIEW_REQUIRED']).toContain(rec.recommendedAction);
      expect(rec).toHaveProperty('requiresHumanReview');
      expect(typeof rec.requiresHumanReview).toBe('boolean');
      expect(rec).toHaveProperty('evidenceReferences');
      expect(rec).toHaveProperty('limitations');
      expect(rec.limitations.length).toBeGreaterThan(0);
    });

    it('strictly recommends REJECT and sets severity HIGH if deterministic checks failed', async () => {
      const rec = await aiIntelligenceService.getRecommendation({
        contractId: 'ct_test_ai',
        milestoneId: 'ms_test_02',
        title: 'Corrupted Deliverable',
        description: 'Test payload',
        amount: '20.00',
        currency: 'USD',
        deliverablePayload: { corrupt: true },
        deterministicPassed: false,
        deterministicErrors: ['Missing required key: items', 'Price must be positive'],
      });

      expect(rec.recommendedAction).toBe('REJECT');
      expect(rec.severity).toBe('high');
      expect(rec.findings.some((f) => f.code === 'DETERMINISTIC_ASSERTION_FAILED')).toBe(true);
    });

    it('supports parallel multi-model comparison across providers and detects consensus', async () => {
      const comparison = await aiIntelligenceService.compareModels({
        contractId: 'ct_intel_pipeline_2026',
        milestoneId: 'ms_pricing_extract',
        title: 'Multi-Retailer Pricing Extraction',
        description: 'Extraction task',
        amount: '15.00',
        currency: 'USD',
        deliverablePayload: { items: [{ sku: 'A', price: 10 }] },
        deterministicPassed: true,
      });

      expect(comparison).toHaveProperty('assessments');
      expect(comparison.assessments).toHaveProperty('gemini');
      expect(comparison.assessments).toHaveProperty('groq');
      expect(comparison.assessments).toHaveProperty('openai');
      expect(comparison).toHaveProperty('consensus');
      expect(typeof comparison.consensus).toBe('boolean');
      expect(['PERMIT', 'REJECT', 'REVIEW_REQUIRED']).toContain(comparison.consensusAction);
    });
  });

  describe('3. Approval Center Operational Controls', () => {
    it('manages human-in-the-loop operational approvals with role validation', () => {
      const approvals = db.getApprovals();
      expect(approvals.length).toBeGreaterThan(0);

      const pending = approvals.find((a) => a.status === 'PENDING');
      expect(pending).toBeDefined();

      const resolved = db.resolveApproval(
        pending!.id,
        'APPROVED',
        'operator_alice@holdfast.local',
        'Verified dataset calibration matches SLA requirements'
      );

      expect(resolved).not.toBeNull();
      expect(resolved?.status).toBe('APPROVED');
      expect(resolved?.approved_by).toBe('operator_alice@holdfast.local');
      expect(resolved?.rationale).toBe('Verified dataset calibration matches SLA requirements');

      const reloaded = db.getApproval(pending!.id);
      expect(reloaded?.status).toBe('APPROVED');
    });
  });
});
