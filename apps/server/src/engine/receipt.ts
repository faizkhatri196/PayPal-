import crypto from 'node:crypto';
import { AcceptanceReceipt, db, Milestone, Contract } from '../db/store.js';
import { DeterministicResult } from '../verifier/deterministic.js';
import { AdversarialResult } from '../verifier/adversarial.js';

const RECEIPT_SIGNING_SECRET = process.env.RECEIPT_SECRET || 'holdfast_receipt_hmac_secret_2026';

export function issueAcceptanceReceipt(
  contract: Contract,
  milestone: Milestone,
  captureId: string,
  deterministicResult: DeterministicResult,
  adversarialResult: AdversarialResult
): AcceptanceReceipt {
  const receiptId = `rcpt_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const checks = deterministicResult.checks_run.map(
    (c) => `${c.name}: ${c.passed ? 'PASS' : 'FAIL'} - ${c.message}`
  );

  const payloadToSign = [
    receiptId,
    contract.id,
    milestone.id,
    contract.paypal_order_id || '',
    contract.paypal_auth_id || '',
    captureId,
    milestone.amount,
    milestone.currency,
    deterministicResult.deliverable_hash,
    now,
  ].join('|');

  const signature = crypto
    .createHmac('sha256', RECEIPT_SIGNING_SECRET)
    .update(payloadToSign)
    .digest('hex');

  const receipt: AcceptanceReceipt = {
    receipt_id: receiptId,
    contract_id: contract.id,
    milestone_id: milestone.id,
    milestone_title: milestone.title,
    settled_amount: milestone.amount,
    currency: milestone.currency,
    paypal_order_id: contract.paypal_order_id || 'UNKNOWN',
    paypal_auth_id: contract.paypal_auth_id || 'UNKNOWN',
    paypal_capture_id: captureId,
    deliverable_hash: deterministicResult.deliverable_hash,
    verifier_summary: {
      gate1_deterministic_passed: deterministicResult.passed,
      gate2_adversarial_veto_passed: !adversarialResult.vetoed,
      checks,
    },
    issued_at: now,
    digital_signature: signature,
  };

  db.saveReceipt(receipt);
  return receipt;
}

export function verifyReceiptSignature(receipt: AcceptanceReceipt): boolean {
  const payloadToSign = [
    receipt.receipt_id,
    receipt.contract_id,
    receipt.milestone_id,
    receipt.paypal_order_id,
    receipt.paypal_auth_id,
    receipt.paypal_capture_id,
    receipt.settled_amount,
    receipt.currency,
    receipt.deliverable_hash,
    receipt.issued_at,
  ].join('|');

  const expected = crypto
    .createHmac('sha256', RECEIPT_SIGNING_SECRET)
    .update(payloadToSign)
    .digest('hex');

  return expected === receipt.digital_signature;
}

export function formatDisputeEvidencePacket(receipt: AcceptanceReceipt, contract: Contract): string {
  return `=== PAYPAL DISPUTE EVIDENCE PACKET: ACCEPTANCE PROOF ===
Receipt ID: ${receipt.receipt_id}
Issued At: ${receipt.issued_at}

1. TRANSACTION IDENTIFIERS
- PayPal Order ID: ${receipt.paypal_order_id}
- PayPal Authorization ID: ${receipt.paypal_auth_id}
- PayPal Capture ID: ${receipt.paypal_capture_id}
- Settled Amount: $${receipt.settled_amount} ${receipt.currency}

2. COUNTERPARTY DETAILS
- Buyer Agent: ${contract.buyer_agent_id}
- Worker Agent: ${contract.worker_agent_id}
- Contract Description: ${contract.description}
- Milestone: ${receipt.milestone_title}

3. PROOF OF ACCEPTANCE & VERIFICATION
- SHA-256 Deliverable Hash: ${receipt.deliverable_hash}
- Deterministic Assertions Passed: ${receipt.verifier_summary.gate1_deterministic_passed ? 'YES' : 'NO'}
- Adversarial Anti-Fraud Review: ${receipt.verifier_summary.gate2_adversarial_veto_passed ? 'APPROVED' : 'REJECTED'}
- Check Traces:
  ${receipt.verifier_summary.checks.map((c) => `  * ${c}`).join('\n')}

4. CRYPTOGRAPHIC PROOF OF AUTHENTICITY
- Digital Signature (HMAC-SHA256): ${receipt.digital_signature}
- Status: This payment was non-custodially authorized by the buyer and programmatically captured only upon passing mathematical assertions.
========================================================`;
}
