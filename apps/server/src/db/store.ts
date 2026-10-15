import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type ContractStatus = 
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'ESCROW_HELD'
  | 'IN_PROGRESS'
  | 'PARTIALLY_SETTLED'
  | 'COMPLETED'
  | 'VOIDED'
  | 'DISPUTED';

export type MilestoneStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'VERIFYING'
  | 'ACCEPTED_SETTLED'
  | 'REJECTED'
  | 'VOIDED';

export interface MilestoneCriteria {
  required_keys: string[];
  schema_type: 'pricing_report' | 'code_review' | 'data_extraction' | 'custom_json';
  min_items?: number;
  max_latency_sec?: number;
}

export interface Milestone {
  id: string;
  contract_id: string;
  sequence: number;
  title: string;
  description: string;
  amount: string; // e.g. "15.00"
  currency: string;
  status: MilestoneStatus;
  criteria: MilestoneCriteria;
  deliverable_payload?: any;
  deliverable_hash?: string;
  verification_trace?: any;
  paypal_capture_id?: string;
  settled_at?: string;
  rejection_reason?: string;
}

export interface Contract {
  id: string;
  title: string;
  description: string;
  buyer_agent_id: string;
  worker_agent_id: string;
  total_amount: string;
  currency: string;
  status: ContractStatus;
  paypal_order_id?: string;
  paypal_auth_id?: string;
  paypal_approve_url?: string;
  custom_contract_hash: string;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface AcceptanceReceipt {
  receipt_id: string;
  contract_id: string;
  milestone_id: string;
  milestone_title: string;
  settled_amount: string;
  currency: string;
  paypal_order_id: string;
  paypal_auth_id: string;
  paypal_capture_id: string;
  deliverable_hash: string;
  verifier_summary: {
    gate1_deterministic_passed: boolean;
    gate2_adversarial_veto_passed: boolean;
    checks: string[];
  };
  issued_at: string;
  digital_signature: string; // HMAC-SHA256
}

export interface AuditLog {
  id: string;
  contract_id?: string;
  event: string;
  details: any;
  timestamp: string;
}

interface DBState {
  contracts: Record<string, Contract>;
  receipts: Record<string, AcceptanceReceipt>;
  audit_logs: AuditLog[];
}

export class DataStore {
  private filePath: string;
  private state: DBState = {
    contracts: {},
    receipts: {},
    audit_logs: [],
  };

  constructor(dbFileName?: string) {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const defaultFile = isTest ? 'holdfast-store.test.json' : 'holdfast-store.json';
    const fileName = dbFileName || process.env.HOLDFAST_DB_FILE || defaultFile;

    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, fileName);
    this.load();

    // If not a test and contracts are missing or lack demonstration tranches, seed realistic data
    if (!isTest && (!this.state.contracts['ct_intel_pipeline_2026'] || !this.state.contracts['ct_reconcile_test'])) {
      this.seedInitialData();
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.state = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[DataStore] Failed to read existing store file, starting empty:', err);
    }
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[DataStore] Persist error:', err);
    }
  }

  public seedInitialData() {
    const now = new Date().toISOString();
    const settledTime = new Date(Date.now() - 3600000).toISOString();
    const receiptSecret = process.env.RECEIPT_SECRET || 'holdfast_receipt_hmac_secret_2026';
    const deliverableHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    // 1. Primary Demonstration Contract with Real Tranches
    const demoContract: Contract = {
      id: 'ct_intel_pipeline_2026',
      title: 'Autonomous Competitor Intelligence Pipeline',
      description: 'Multi-agent e-commerce catalog crawler, anomaly detection model, and cryptographic acceptance receipts.',
      buyer_agent_id: 'agent_retail_inventory',
      worker_agent_id: 'agent_crawler_node_4',
      total_amount: '35.00',
      currency: 'USD',
      status: 'PARTIALLY_SETTLED',
      paypal_order_id: 'ORD_HOLDFAST_7719',
      paypal_auth_id: 'AUTH_HOLDFAST_8820',
      custom_contract_hash: 'hash_intel_7719_live',
      created_at: settledTime,
      updated_at: now,
      milestones: [
        {
          id: 'ms_pricing_extract',
          contract_id: 'ct_intel_pipeline_2026',
          sequence: 1,
          title: 'Milestone 1: Multi-Retailer Pricing Extraction',
          description: 'Extract raw pricing dataset from 5 online retailers in valid JSON schema with min 2 items.',
          amount: '15.00',
          currency: 'USD',
          status: 'ACCEPTED_SETTLED',
          criteria: {
            schema_type: 'pricing_report',
            required_keys: ['market_id', 'items', 'timestamp'],
            min_items: 2,
          },
          deliverable_payload: {
            market_id: 'US_EAST_ECOMMERCE',
            timestamp: settledTime,
            items: [
              { sku: 'WIDGET-PRO-1', price: 29.99, currency: 'USD' },
              { sku: 'WIDGET-AIR-2', price: 49.5, currency: 'USD' },
            ],
          },
          deliverable_hash: deliverableHash,
          paypal_capture_id: 'CAP_PAYPAL_994101',
          settled_at: settledTime,
          verification_trace: {
            deterministic: {
              passed: true,
              checks_run: [
                { name: 'schema_type', passed: true, message: 'Valid schema structure pricing_report' },
                { name: 'required_keys', passed: true, message: 'All required keys present [market_id, items, timestamp]' },
                { name: 'min_items', passed: true, message: 'Items array has 2 items (>= 2)' },
                { name: 'positive_prices', passed: true, message: 'All prices are valid positive numbers' },
              ],
            },
            adversarial: {
              vetoed: false,
              confidence: 0.99,
              reason: 'Zero prompt-injection, exfiltration, or adversarial jailbreak patterns detected',
            },
          },
        },
        {
          id: 'ms_outlier_model',
          contract_id: 'ct_intel_pipeline_2026',
          sequence: 2,
          title: 'Milestone 2: Statistical Outlier & Markdown Model',
          description: 'Identify anomalous pricing swings and compute markdown risk indices against benchmark dataset.',
          amount: '20.00',
          currency: 'USD',
          status: 'PENDING',
          criteria: {
            schema_type: 'custom_json',
            required_keys: ['summary', 'risk_score', 'anomaly_detected'],
          },
        },
      ],
    };

    // 2. Acceptance Receipt for Milestone 1
    const receiptId = 'rcpt_ms_pricing_extract';
    const payloadToSign = [
      receiptId,
      demoContract.id,
      'ms_pricing_extract',
      demoContract.paypal_order_id,
      demoContract.paypal_auth_id,
      'CAP_PAYPAL_994101',
      '15.00',
      'USD',
      deliverableHash,
      settledTime,
    ].join('|');

    const signature = crypto
      .createHmac('sha256', receiptSecret)
      .update(payloadToSign)
      .digest('hex');

    const demoReceipt: AcceptanceReceipt = {
      receipt_id: receiptId,
      contract_id: demoContract.id,
      milestone_id: 'ms_pricing_extract',
      milestone_title: 'Milestone 1: Multi-Retailer Pricing Extraction',
      settled_amount: '15.00',
      currency: 'USD',
      paypal_order_id: demoContract.paypal_order_id!,
      paypal_auth_id: demoContract.paypal_auth_id!,
      paypal_capture_id: 'CAP_PAYPAL_994101',
      deliverable_hash: deliverableHash,
      verifier_summary: {
        gate1_deterministic_passed: true,
        gate2_adversarial_veto_passed: true,
        checks: [
          'Gate 1: Schema validation passed (pricing_report)',
          'Gate 1: Minimum items requirement met (2 items)',
          'Gate 1: All prices strictly positive numeric values',
          'Gate 2: Adversarial auditor passed (0 prompt-injection patterns detected)',
        ],
      },
      issued_at: settledTime,
      digital_signature: signature,
    };

    // 3. Specialized Reconciliation & Fault Recovery Contract
    const reconcileContract: Contract = {
      id: 'ct_reconcile_test',
      title: 'Reconciliation Test (Network Fault Recovery)',
      description: 'Specialized idempotency scenario: tests upstream network timeout recovery and duplicate-capture prevention on uncaptured authorization holds.',
      buyer_agent_id: 'agent_buyer_reconcile',
      worker_agent_id: 'agent_worker_gateway',
      total_amount: '35.00',
      currency: 'USD',
      status: 'ESCROW_HELD',
      paypal_order_id: 'ORD_REC_8841',
      paypal_auth_id: 'AUTH_REC_9922',
      custom_contract_hash: 'hash_rec_123',
      milestones: [],
      created_at: settledTime,
      updated_at: now,
    };

    // Persist into state
    this.state.contracts[demoContract.id] = demoContract;
    this.state.contracts[reconcileContract.id] = reconcileContract;
    this.state.receipts[demoReceipt.receipt_id] = demoReceipt;

    // Seed audit logs
    this.state.audit_logs = [
      {
        id: `audit_seed_4`,
        contract_id: demoContract.id,
        event: 'ACCEPTANCE_RECEIPT_ISSUED',
        details: { receipt_id: demoReceipt.receipt_id, milestone_id: 'ms_pricing_extract', amount: '15.00' },
        timestamp: settledTime,
      },
      {
        id: `audit_seed_3`,
        contract_id: demoContract.id,
        event: 'TRANCHE_CAPTURED',
        details: { capture_id: 'CAP_PAYPAL_994101', amount: '15.00', final_capture: false },
        timestamp: settledTime,
      },
      {
        id: `audit_seed_2`,
        contract_id: demoContract.id,
        event: 'DUAL_VERIFICATION_PASSED',
        details: { milestone: 'Milestone 1', gate1: 'PASSED', gate2: 'PASSED' },
        timestamp: settledTime,
      },
      {
        id: `audit_seed_1`,
        contract_id: demoContract.id,
        event: 'PAYPAL_AUTHORIZATION_ACTIVE',
        details: { auth_id: demoContract.paypal_auth_id, total_held: '35.00' },
        timestamp: settledTime,
      },
      {
        id: `audit_seed_0`,
        contract_id: reconcileContract.id,
        event: 'RECONCILIATION_FIXTURE_READY',
        details: { paypal_auth_id: reconcileContract.paypal_auth_id, hold_verified: true },
        timestamp: settledTime,
      },
    ];

    this.persist();
  }

  // Contract Methods
  createContract(contract: Omit<Contract, 'created_at' | 'updated_at'>): Contract {
    const now = new Date().toISOString();
    const full: Contract = {
      ...contract,
      created_at: now,
      updated_at: now,
    };
    this.state.contracts[full.id] = full;
    this.persist();
    this.logAudit(full.id, 'CONTRACT_CREATED', { title: full.title, total_amount: full.total_amount });
    return full;
  }

  getContract(id: string): Contract | null {
    this.load();
    return this.state.contracts[id] || null;
  }

  getAllContracts(): Contract[] {
    this.load();
    return Object.values(this.state.contracts).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  updateContract(id: string, updates: Partial<Contract>): Contract | null {
    const existing = this.state.contracts[id];
    if (!existing) return null;
    const updated: Contract = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.state.contracts[id] = updated;
    this.persist();
    this.logAudit(id, 'CONTRACT_UPDATED', updates);
    return updated;
  }

  // Milestone Methods
  updateMilestone(contractId: string, milestoneId: string, updates: Partial<Milestone>): Milestone | null {
    const contract = this.state.contracts[contractId];
    if (!contract) return null;
    const idx = contract.milestones.findIndex((m) => m.id === milestoneId);
    if (idx === -1) return null;

    contract.milestones[idx] = {
      ...contract.milestones[idx],
      ...updates,
    };
    contract.updated_at = new Date().toISOString();
    this.persist();
    this.logAudit(contractId, 'MILESTONE_UPDATED', { milestoneId, updates });
    return contract.milestones[idx];
  }

  // Receipt Methods
  saveReceipt(receipt: AcceptanceReceipt): AcceptanceReceipt {
    this.state.receipts[receipt.receipt_id] = receipt;
    this.persist();
    this.logAudit(receipt.contract_id, 'ACCEPTANCE_RECEIPT_ISSUED', {
      receipt_id: receipt.receipt_id,
      milestone_id: receipt.milestone_id,
      amount: receipt.settled_amount,
    });
    return receipt;
  }

  getReceipt(receiptId: string): AcceptanceReceipt | null {
    this.load();
    return this.state.receipts[receiptId] || null;
  }

  getReceiptsForContract(contractId: string): AcceptanceReceipt[] {
    this.load();
    return Object.values(this.state.receipts).filter((r) => r.contract_id === contractId);
  }

  // Audit Logs
  logAudit(contractId: string | undefined, event: string, details: any): AuditLog {
    const log: AuditLog = {
      id: `audit_${crypto.randomUUID()}`,
      contract_id: contractId,
      event,
      details,
      timestamp: new Date().toISOString(),
    };
    this.state.audit_logs.unshift(log);
    if (this.state.audit_logs.length > 500) {
      this.state.audit_logs.pop();
    }
    this.persist();
    return log;
  }

  getAuditLogs(limit = 100): AuditLog[] {
    this.load();
    return this.state.audit_logs.slice(0, limit);
  }

  clear() {
    this.state = { contracts: {}, receipts: {}, audit_logs: [] };
    this.persist();
  }
}

export const db = new DataStore();
