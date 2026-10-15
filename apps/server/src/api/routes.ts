import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/store.js';
import { CONFIG } from '../config.js';
import { orchestrator } from '../engine/orchestrator.js';
import { verifyReceiptSignature, formatDisputeEvidencePacket } from '../engine/receipt.js';

export const apiRouter = Router();

// Middleware: Request ID and Correlation Tracking
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || `req_${crypto.randomUUID().slice(0, 8)}`;
  res.setHeader('x-request-id', reqId);
  (req as any).requestId = reqId;
  next();
});

// Helper for structured error responses
function sendError(res: Response, status: number, code: string, message: string, req: Request) {
  const reqId = (req as any).requestId || 'unknown';
  return res.status(status).json({
    error: {
      code,
      message,
      requestId: reqId,
      timestamp: new Date().toISOString(),
    },
  });
}

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Holdfast Acceptance Receipt Protocol',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// List all contracts
apiRouter.get('/contracts', (req, res) => {
  res.json({ contracts: db.getAllContracts() });
});

// Create new escrow contract
apiRouter.post('/contracts', async (req, res) => {
  try {
    const { title, description, buyer_agent_id, worker_agent_id, milestones } = req.body;
    if (!title || !buyer_agent_id || !worker_agent_id || !Array.isArray(milestones) || milestones.length === 0) {
      return sendError(res, 400, 'INVALID_REQUEST_BODY', 'Missing required contract fields', req);
    }

    const contract = await orchestrator.createContract({
      title,
      description: description || '',
      buyer_agent_id,
      worker_agent_id,
      milestones,
    });

    res.status(201).json({ contract });
  } catch (err: any) {
    sendError(res, 400, 'CONTRACT_CREATION_FAILED', err.message, req);
  }
});

// Get single contract details
apiRouter.get('/contracts/:id', (req, res) => {
  const contract = db.getContract(req.params.id);
  if (!contract) return sendError(res, 404, 'CONTRACT_NOT_FOUND', `Contract ${req.params.id} not found`, req);
  const receipts = db.getReceiptsForContract(contract.id);
  res.json({ contract, receipts });
});

// Confirm hold after buyer approval on PayPal Sandbox
apiRouter.post('/contracts/:id/hold', async (req, res) => {
  try {
    const callerId = req.headers['x-agent-id'] as string;
    const contract = db.getContract(req.params.id);
    if (!contract) return sendError(res, 404, 'CONTRACT_NOT_FOUND', `Contract ${req.params.id} not found`, req);

    if (callerId && callerId !== contract.buyer_agent_id && callerId !== 'admin') {
      return sendError(res, 403, 'FORBIDDEN', 'Only the designated buyer agent can authorize this hold', req);
    }

    const result = await orchestrator.confirmHold(req.params.id);
    res.json(result);
  } catch (err: any) {
    sendError(res, 422, 'AUTHORIZATION_FAILED', err.message, req);
  }
});

// Submit deliverable for a milestone
apiRouter.post('/contracts/:id/milestones/:milestoneId/submit', async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return sendError(res, 400, 'EMPTY_PAYLOAD', 'Deliverable payload is required', req);
    }

    const callerId = req.headers['x-agent-id'] as string;
    const contract = db.getContract(req.params.id);
    if (!contract) return sendError(res, 404, 'CONTRACT_NOT_FOUND', `Contract ${req.params.id} not found`, req);

    if (callerId && callerId !== contract.worker_agent_id && callerId !== 'admin') {
      return sendError(res, 403, 'FORBIDDEN', 'Only the designated worker agent can submit for this milestone', req);
    }

    const result = await orchestrator.submitAndVerifyMilestone(
      req.params.id,
      req.params.milestoneId,
      payload
    );
    res.json(result);
  } catch (err: any) {
    sendError(res, 400, 'VERIFICATION_OR_CAPTURE_FAILED', err.message, req);
  }
});

// Void remaining hold
apiRouter.post('/contracts/:id/void', async (req, res) => {
  try {
    const callerId = req.headers['x-agent-id'] as string;
    const contract = db.getContract(req.params.id);
    if (!contract) return sendError(res, 404, 'CONTRACT_NOT_FOUND', `Contract ${req.params.id} not found`, req);

    if (callerId && callerId !== contract.buyer_agent_id && callerId !== 'admin') {
      return sendError(res, 403, 'FORBIDDEN', 'Only the designated buyer agent or admin can void remaining hold', req);
    }

    const result = await orchestrator.voidRemainder(req.params.id);
    res.json(result);
  } catch (err: any) {
    sendError(res, 400, 'VOID_FAILED', err.message, req);
  }
});

// Reconcile contract (Lost-Response recovery)
apiRouter.post('/contracts/:id/reconcile', async (req, res) => {
  try {
    const result = await orchestrator.reconcile(req.params.id);
    res.json(result);
  } catch (err: any) {
    sendError(res, 500, 'RECONCILIATION_FAILED', err.message, req);
  }
});

// Fetch Acceptance Receipt
apiRouter.get('/receipts/:id', (req, res) => {
  const receipt = db.getReceipt(req.params.id);
  if (!receipt) return sendError(res, 404, 'RECEIPT_NOT_FOUND', `Receipt ${req.params.id} not found`, req);

  const contract = db.getContract(receipt.contract_id);
  const isValidSignature = verifyReceiptSignature(receipt);
  const disputeEvidence = contract ? formatDisputeEvidencePacket(receipt, contract) : '';

  res.json({
    receipt,
    signature_valid: isValidSignature,
    dispute_evidence_packet: disputeEvidence,
  });
});

// Audit Logs
apiRouter.get('/audit-logs', (req, res) => {
  res.json({ logs: db.getAuditLogs(100) });
});

// AI Agent Deliverable Generator (Powered by Groq LPU)
apiRouter.post('/agent/generate-deliverable', async (req, res) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    let payload: any = null;
    let generatorUsed = 'heuristic-generator';

    if (CONFIG.AI.GROQ_API_KEY) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CONFIG.AI.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            messages: [
              {
                role: 'system',
                content: 'You are an autonomous worker agent. Generate a clean JSON deliverable matching: {"market_id": string, "timestamp": string, "items": [{"sku": string, "price": number, "currency": "USD"}], "summary": string, "risk_score": number, "anomaly_detected": boolean}. Output valid JSON only.',
              },
              {
                role: 'user',
                content: `Task: ${taskTitle || 'Competitor pricing crawl'}. Details: ${taskDescription || 'Extract competitor prices'}`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (groqRes.ok) {
          const gData = await groqRes.json();
          payload = JSON.parse(gData.choices?.[0]?.message?.content || '{}');
          generatorUsed = 'qwen/qwen3.8-27b (Groq LPU)';
        }
      } catch (err) {
        console.warn('Groq generation fallback:', err);
      }
    }

    if (!payload || !payload.items) {
      payload = {
        market_id: 'US_EAST_ECOMMERCE',
        timestamp: new Date().toISOString(),
        items: [
          { sku: 'ALPHA-PRO-1', price: 29.99, currency: 'USD' },
          { sku: 'BETA-MAX-2', price: 49.5, currency: 'USD' },
        ],
        summary: 'Competitor pricing crawl completed successfully across 5 target retailers',
        risk_score: 0.08,
        anomaly_detected: false,
      };
    }

    res.json({
      success: true,
      generator: generatorUsed,
      payload,
    });
  } catch (err: any) {
    sendError(res, 500, 'GENERATION_FAILED', err.message, req);
  }
});
