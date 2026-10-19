import crypto from 'node:crypto';
import { db, Contract, Milestone, MilestoneCriteria } from '../db/store.js';
import { paypal } from '../paypal/client.js';
import { runDeterministicVerification } from '../verifier/deterministic.js';
import { runAdversarialAudit } from '../verifier/adversarial.js';
import { issueAcceptanceReceipt } from './receipt.js';
import {
  toCents,
  toDecimalString,
  validateMilestonesSum,
  validateCaptureBounds,
  FinancialInvariantError,
} from '../utils/money.js';

export interface CreateContractParams {
  title: string;
  description: string;
  buyer_agent_id: string;
  worker_agent_id: string;
  milestones: Array<{
    title: string;
    description: string;
    amount: string;
    criteria: MilestoneCriteria;
  }>;
}

export class EscrowOrchestrator {
  // In-flight mutex set to prevent race conditions on concurrent contract mutations
  private inFlightLocks = new Set<string>();

  private acquireLock(contractId: string) {
    if (this.inFlightLocks.has(contractId)) {
      throw new Error(`[CONCURRENCY CONFLICT] An operation is already in progress for contract ${contractId}`);
    }
    this.inFlightLocks.add(contractId);
  }

  private releaseLock(contractId: string) {
    this.inFlightLocks.delete(contractId);
  }

  async createContract(params: CreateContractParams) {
    const contractId = `ct_${crypto.randomUUID().slice(0, 8)}`;
    const contractHash = `hash_${crypto.randomBytes(6).toString('hex')}`;

    // 1. Validate all milestone amounts using integer cents
    const milestoneAmounts = params.milestones.map((m) => {
      const cents = toCents(m.amount);
      return toDecimalString(cents);
    });

    const totalCents = milestoneAmounts.reduce((sum, amt) => sum + toCents(amt), 0);
    const totalAmount = toDecimalString(totalCents);

    // Verify sum consistency
    validateMilestonesSum(milestoneAmounts, totalAmount);

    const milestones: Milestone[] = params.milestones.map((m, idx) => ({
      id: `ms_${crypto.randomUUID().slice(0, 8)}`,
      contract_id: contractId,
      sequence: idx + 1,
      title: m.title,
      description: m.description,
      amount: milestoneAmounts[idx],
      currency: 'USD',
      status: 'PENDING',
      criteria: m.criteria,
    }));

    // 2. Create order on PayPal Sandbox with intent: "AUTHORIZE"
    const orderResult = await paypal.createAuthorizeOrder(
      contractId,
      contractHash,
      totalAmount,
      milestones.map((m) => ({ title: m.title, amount: m.amount }))
    );

    const contract = db.createContract({
      id: contractId,
      title: params.title,
      description: params.description,
      buyer_agent_id: params.buyer_agent_id,
      worker_agent_id: params.worker_agent_id,
      total_amount: totalAmount,
      currency: 'USD',
      status: 'AWAITING_APPROVAL',
      paypal_order_id: orderResult.orderId,
      paypal_approve_url: orderResult.approveUrl,
      custom_contract_hash: contractHash,
      milestones,
    });

    return contract;
  }

  async confirmHold(contractId: string) {
    this.acquireLock(contractId);
    try {
      const contract = db.getContract(contractId);
      if (!contract) throw new Error(`Contract ${contractId} not found`);
      if (!contract.paypal_order_id) throw new Error('Contract missing PayPal order ID');

      const isDemo = contract.paypal_order_id.startsWith('DEMO_') || contract.id.startsWith('ct_demo_');
      let authResult: any;

      if (isDemo) {
        authResult = {
          id: `AUTH_DEMO_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          status: 'CREATED',
          amount: { currency_code: contract.currency, value: contract.total_amount },
          expiration_time: new Date(Date.now() + 29 * 86400 * 1000).toISOString(),
        };
      } else {
        // Call PayPal authorize to lock the funds
        authResult = await paypal.authorizeOrder(contract.paypal_order_id);
      }

      const updated = db.updateContract(contractId, {
        status: 'ESCROW_HELD',
        paypal_auth_id: authResult.id,
      });

      return {
        contract: updated,
        authorization: authResult,
      };
    } finally {
      this.releaseLock(contractId);
    }
  }

  async submitAndVerifyMilestone(contractId: string, milestoneId: string, payload: any) {
    this.acquireLock(contractId);
    try {
      const contract = db.getContract(contractId);
      if (!contract) throw new Error(`Contract ${contractId} not found`);
      if (contract.status !== 'ESCROW_HELD' && contract.status !== 'PARTIALLY_SETTLED') {
        throw new Error(`Cannot submit deliverable in contract status ${contract.status}`);
      }

      const milestone = contract.milestones.find((m) => m.id === milestoneId);
      if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
      if (milestone.status === 'ACCEPTED_SETTLED') {
        throw new Error(`Milestone ${milestoneId} is already settled`);
      }

      // Check financial bounds before running verifiers
      const settledMilestones = contract.milestones
        .filter((m) => m.status === 'ACCEPTED_SETTLED')
        .map((m) => m.amount);

      validateCaptureBounds(contract.total_amount, settledMilestones, milestone.amount);

      db.updateMilestone(contractId, milestoneId, {
        status: 'VERIFYING',
        deliverable_payload: payload,
      });

      // GATE 1: Deterministic Verifier (ONLY checks that can release funds)
      const deterministicResult = runDeterministicVerification(payload, milestone.criteria);
      if (!deterministicResult.passed) {
        db.updateMilestone(contractId, milestoneId, {
          status: 'REJECTED',
          deliverable_hash: deterministicResult.deliverable_hash,
          verification_trace: deterministicResult,
          rejection_reason: deterministicResult.failure_reason,
        });
        return {
          accepted: false,
          gate: 'GATE_1_DETERMINISTIC',
          reason: deterministicResult.failure_reason,
          trace: deterministicResult,
        };
      }

      // GATE 2: Adversarial Auditor (Veto-Only Principle)
      const adversarialResult = await runAdversarialAudit(
        payload,
        `${milestone.title}: ${milestone.description}`
      );

      if (adversarialResult.vetoed) {
        db.updateMilestone(contractId, milestoneId, {
          status: 'REJECTED',
          deliverable_hash: deterministicResult.deliverable_hash,
          verification_trace: { deterministic: deterministicResult, adversarial: adversarialResult },
          rejection_reason: adversarialResult.veto_reason,
        });
        return {
          accepted: false,
          gate: 'GATE_2_ADVERSARIAL_VETO',
          reason: adversarialResult.veto_reason,
          injection_detected: adversarialResult.injection_detected,
          trace: adversarialResult,
        };
      }

      // BOTH GATES PASSED: Settle Tranche on PayPal (or mock for isolated demo)
      const isDemo = contract.paypal_order_id?.startsWith('DEMO_') || contract.id.startsWith('ct_demo_');
      let captureResult: any;

      // Compute remaining active milestones (excluding rejected and voided)
      const remainingActive = contract.milestones.filter(
        (m) => m.id !== milestoneId && (m.status === 'PENDING' || m.status === 'VERIFYING')
      );
      const isFinalCapture = remainingActive.length === 0;

      if (isDemo) {
        captureResult = {
          id: `CAP_DEMO_${crypto.randomUUID().slice(0, 10).toUpperCase()}`,
          status: 'COMPLETED',
          amount: { currency_code: milestone.currency, value: milestone.amount },
          final_capture: isFinalCapture,
          create_time: new Date().toISOString(),
        };
      } else {
        if (!contract.paypal_auth_id) {
          throw new Error('Missing PayPal authorization ID for capture');
        }

        const captureReqId = `cap_${crypto.randomUUID()}`;
        captureResult = await paypal.captureTranche(
          contract.paypal_auth_id,
          milestone.amount,
          isFinalCapture,
          captureReqId
        );
      }

      // Issue Cryptographic Acceptance Receipt
      const receipt = issueAcceptanceReceipt(
        contract,
        milestone,
        captureResult.id,
        deterministicResult,
        adversarialResult
      );

      // Update Milestone
      const updatedMilestone = db.updateMilestone(contractId, milestoneId, {
        status: 'ACCEPTED_SETTLED',
        deliverable_hash: deterministicResult.deliverable_hash,
        paypal_capture_id: captureResult.id,
        settled_at: new Date().toISOString(),
        verification_trace: { deterministic: deterministicResult, adversarial: adversarialResult },
      });

      // Update Contract Status
      const newContractStatus = isFinalCapture ? 'COMPLETED' : 'PARTIALLY_SETTLED';
      db.updateContract(contractId, { status: newContractStatus });

      return {
        accepted: true,
        capture: captureResult,
        receipt,
        milestone: updatedMilestone,
        contract_status: newContractStatus,
      };
    } finally {
      this.releaseLock(contractId);
    }
  }

  async voidRemainder(contractId: string) {
    this.acquireLock(contractId);
    try {
      const contract = db.getContract(contractId);
      if (!contract) throw new Error(`Contract ${contractId} not found`);

      const isDemo = contract.paypal_order_id?.startsWith('DEMO_') || contract.id.startsWith('ct_demo_');
      let voidResult: any;

      if (isDemo) {
        voidResult = { success: true, status: 200, is_demo: true };
      } else {
        if (!contract.paypal_auth_id) throw new Error('Contract has no active authorization to void');
        const voidReqId = `void_${crypto.randomUUID()}`;
        voidResult = await paypal.voidAuthorization(contract.paypal_auth_id, voidReqId);
      }

      // Mark all pending milestones as voided
      for (const m of contract.milestones) {
        if (m.status !== 'ACCEPTED_SETTLED') {
          db.updateMilestone(contractId, m.id, { status: 'VOIDED' });
        }
      }

      const updated = db.updateContract(contractId, { status: 'VOIDED' });
      return { success: true, contract: updated, voidResult };
    } finally {
      this.releaseLock(contractId);
    }
  }

  // Reconciliation for Lost-Response Recovery
  async reconcile(contractId: string) {
    this.acquireLock(contractId);
    try {
      const contract = db.getContract(contractId);
      if (!contract) throw new Error(`Contract ${contractId} not found`);
      if (!contract.paypal_auth_id) throw new Error('No authorization ID to reconcile');

      const liveAuth = await paypal.reconcileAuthorization(contract.paypal_auth_id);
      db.logAudit(contractId, 'RECONCILED_WITH_PAYPAL', liveAuth);

      return {
        contract_id: contractId,
        local_status: contract.status,
        paypal_status: liveAuth.status,
        held_amount: liveAuth.amount,
        custom_id_matched: liveAuth.custom_id === contract.custom_contract_hash,
        liveAuth,
      };
    } finally {
      this.releaseLock(contractId);
    }
  }
}

export const orchestrator = new EscrowOrchestrator();
