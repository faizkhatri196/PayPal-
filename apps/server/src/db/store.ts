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
  actor?: string;
  details: any;
  timestamp: string;
}

export interface ApprovalRequest {
  id: string;
  operation: 'TRANCHE_CAPTURE' | 'VOID_REMAINDER' | 'POLICY_OVERRIDE_REVIEW' | 'CONTRACT_DISBURSEMENT';
  contract_id: string;
  milestone_id?: string;
  contract_title: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by: string;
  required_role: string;
  approved_by?: string;
  approved_at?: string;
  rationale?: string;
  policy_checks: Array<{ code: string; passed: boolean; message: string }>;
  ai_risk_severity: 'low' | 'medium' | 'high' | 'critical';
  ai_recommendation_summary: string;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  contract_id: string;
  milestone_id?: string;
  title: string;
  provider: string;
  data_source: 'Simulated Demo' | 'Live PayPal Sandbox';
  is_simulated: boolean;
  amount: string;
  currency: string;
  payment_state: 'Authorized' | 'Captured' | 'Held' | 'Voided' | 'Pending Review';
  verification: 'Passed' | 'Rejected' | 'Pending' | 'Vetoed';
  risk: 'Low' | 'Medium' | 'High' | 'Review Required';
  ai_assessment: string;
  reconciliation: 'Confirmed' | 'Pending Sync' | 'Reconciled' | 'Desynced';
  updated_at: string;
  details: {
    paypal_order_id?: string;
    paypal_auth_id?: string;
    paypal_capture_id?: string;
    buyer_agent_id: string;
    worker_agent_id: string;
    deliverable_hash?: string;
    receipt_id?: string;
    verification_trace?: any;
    audit_events_count: number;
    requires_human_approval: boolean;
  };
}

interface DBState {
  contracts: Record<string, Contract>;
  receipts: Record<string, AcceptanceReceipt>;
  approvals: Record<string, ApprovalRequest>;
  audit_logs: AuditLog[];
}

export class DataStore {
  private filePath: string;
  private state: DBState = {
    contracts: {},
    receipts: {},
    approvals: {},
    audit_logs: [],
  };

  private isTest: boolean;

  constructor(dbFileName?: string) {
    this.isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const defaultFile = this.isTest ? 'holdfast-store.test.json' : 'holdfast-store.json';
    const fileName = dbFileName || process.env.HOLDFAST_DB_FILE || defaultFile;

    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, fileName);
    this.load();

    // If not a test and contracts are missing or lack demonstration tranches, seed realistic data
    if (!this.isTest && (!this.state.contracts['ct_intel_pipeline_2026'] || !this.state.contracts['ct_reconcile_test'])) {
      this.seedInitialData();
    }
  }

  private load() {
    if (this.isTest) return; // Keep memory state in test workers to avoid cross-file race conditions
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = {
          contracts: parsed.contracts || {},
          receipts: parsed.receipts || {},
          approvals: parsed.approvals || {},
          audit_logs: parsed.audit_logs || [],
        };
      }
    } catch (err) {
      console.warn('[DataStore] Failed to read existing store file, starting empty:', err);
    }
  }

  private persist() {
    if (this.isTest) return;
    try {
      const tmp = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
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

    // 4. Deterministic Ceiling Rejection Contract ($150 requested against $100 authorized hold)
    const ceilingRejectionContract: Contract = {
      id: 'ct_ceiling_breach_demo',
      title: 'Ceiling Breach Test ($150 requested on $100 hold)',
      description: 'Agent requested $150.00 payout exceeding the $100.00 pre-authorized ceiling. Gate 1 halted execution before capture ($0 moved).',
      buyer_agent_id: 'agent_buyer_risk_control',
      worker_agent_id: 'agent_rogue_worker',
      total_amount: '100.00',
      currency: 'USD',
      status: 'ESCROW_HELD',
      paypal_order_id: 'DEMO_ORD_CEIL_9901',
      paypal_auth_id: 'AUTH_DEMO_CEIL_7741',
      custom_contract_hash: 'hash_ceil_breach_test',
      milestones: [
        {
          id: 'ms_ceil_breach_01',
          contract_id: 'ct_ceiling_breach_demo',
          sequence: 1,
          title: 'Excessive Tranche Settlement Request',
          description: 'Autonomous worker requested payout exceeding maximum authorized ceiling.',
          amount: '150.00',
          currency: 'USD',
          status: 'REJECTED',
          criteria: {
            schema_type: 'pricing_report',
            required_keys: ['items', 'summary'],
            min_items: 1,
          },
          rejection_reason: 'Gate 1 Deterministic Error: Requested capture amount ($150.00) exceeds remaining authorized hold ceiling ($100.00). Capture blocked.',
          verification_trace: {
            deterministic: {
              passed: false,
              checks_run: [
                { name: 'PAYLOAD_SCHEMA', passed: true, message: 'Valid JSON schema' },
                { name: 'FINANCIAL_BOUNDS_CEILING', passed: false, message: 'Requested $150.00 exceeds authorized ceiling of $100.00' },
              ],
              failure_reason: 'Requested capture amount ($150.00) exceeds remaining authorized hold ceiling ($100.00).',
            },
            adversarial: {
              vetoed: false,
              model_used: 'heuristic-guard',
              confidence: 0.99,
              note: 'Gate 2 bypassed because Gate 1 deterministic check failed.',
            },
          },
        },
      ],
      created_at: settledTime,
      updated_at: now,
    };

    // Persist into state
    this.state.contracts[demoContract.id] = demoContract;
    this.state.contracts[reconcileContract.id] = reconcileContract;
    this.state.contracts[ceilingRejectionContract.id] = ceilingRejectionContract;
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

    // 4. Seed initial demonstration approval items
    const demoApproval: ApprovalRequest = {
      id: 'appr_sample_review_01',
      operation: 'TRANCHE_CAPTURE',
      contract_id: demoContract.id,
      milestone_id: 'ms_outlier_model',
      contract_title: demoContract.title,
      amount: '20.00',
      currency: 'USD',
      status: 'PENDING',
      requested_by: 'agent_crawler_node_4',
      required_role: 'Operations Lead',
      policy_checks: [
        { code: 'POL_AMOUNT_BOUND', passed: true, message: 'Amount $20.00 within remaining authorized hold ($20.00)' },
        { code: 'POL_CURRENCY_MATCH', passed: true, message: 'Currency USD matches authorization' },
        { code: 'POL_HIGH_VALUE_THRESHOLD', passed: false, message: 'Automated policy flagged for secondary operator sign-off' },
      ],
      ai_risk_severity: 'medium',
      ai_recommendation_summary: 'Outlier model deliverable requires confirmation of dataset calibration parameters before settlement.',
      created_at: new Date(Date.now() - 1800000).toISOString(),
    };
    this.state.approvals[demoApproval.id] = demoApproval;

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

  addAuditLog(log: Partial<AuditLog> & { event: string }): AuditLog {
    const fullLog: AuditLog = {
      id: log.id || `audit_${crypto.randomUUID()}`,
      contract_id: log.contract_id,
      event: log.event,
      actor: log.actor,
      details: log.details || {},
      timestamp: log.timestamp || new Date().toISOString(),
    };
    this.state.audit_logs.unshift(fullLog);
    if (this.state.audit_logs.length > 500) {
      this.state.audit_logs.pop();
    }
    this.persist();
    return fullLog;
  }

  getAuditLogs(limitOrContractId?: number | string): AuditLog[] {
    this.load();
    if (typeof limitOrContractId === 'string') {
      return this.state.audit_logs.filter((l) => l.contract_id === limitOrContractId);
    }
    const limit = typeof limitOrContractId === 'number' ? limitOrContractId : 100;
    return this.state.audit_logs.slice(0, limit);
  }

  // Approval Methods
  getApprovals(): ApprovalRequest[] {
    this.load();
    return Object.values(this.state.approvals || {}).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getApproval(id: string): ApprovalRequest | null {
    this.load();
    return this.state.approvals?.[id] || null;
  }

  createApproval(data: Omit<ApprovalRequest, 'id' | 'created_at' | 'status'>): ApprovalRequest {
    const id = `appr_${crypto.randomUUID().slice(0, 8)}`;
    const approval: ApprovalRequest = {
      ...data,
      id,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    if (!this.state.approvals) this.state.approvals = {};
    this.state.approvals[id] = approval;
    this.persist();
    this.logAudit(approval.contract_id, 'APPROVAL_REQUESTED', {
      approval_id: id,
      operation: approval.operation,
      amount: approval.amount,
      requested_by: approval.requested_by,
      required_role: approval.required_role,
    });
    return approval;
  }

  resolveApproval(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    approvedBy: string,
    rationale?: string
  ): ApprovalRequest | null {
    this.load();
    const approval = this.state.approvals?.[id];
    if (!approval) return null;
    approval.status = status;
    approval.approved_by = approvedBy;
    approval.approved_at = new Date().toISOString();
    approval.rationale = rationale;
    this.persist();
    this.logAudit(approval.contract_id, `APPROVAL_${status}`, {
      approval_id: id,
      approved_by: approvedBy,
      rationale,
    });
    return approval;
  }

  // Transactions list compiled for AG Grid
  getAllTransactions(): TransactionRecord[] {
    this.load();
    const records: TransactionRecord[] = [];

    for (const contract of Object.values(this.state.contracts || {})) {
      const isSimulated =
        !contract.paypal_order_id ||
        contract.paypal_order_id.startsWith('SANDBOX_') ||
        contract.id.startsWith('ct_intel_') ||
        contract.id.startsWith('ct_reconcile_');
      const dataSource: 'Simulated Demo' | 'Live PayPal Sandbox' = isSimulated
        ? 'Simulated Demo'
        : 'Live PayPal Sandbox';
      const providerName = 'PayPal Sandbox';

      if (!contract.milestones || contract.milestones.length === 0) {
        records.push({
          id: `TXN-${contract.id.replace('ct_', '').slice(0, 8).toUpperCase()}-HOLD`,
          contract_id: contract.id,
          title: `${contract.title} (Pre-Auth Hold)`,
          provider: providerName,
          data_source: dataSource,
          is_simulated: isSimulated,
          amount: contract.total_amount,
          currency: contract.currency,
          payment_state: contract.status === 'VOIDED' ? 'Voided' : 'Held',
          verification: 'Passed',
          risk: 'Low',
          ai_assessment: 'Authorization Hold Verified',
          reconciliation: 'Confirmed',
          updated_at: contract.updated_at || contract.created_at,
          details: {
            paypal_order_id: contract.paypal_order_id,
            paypal_auth_id: contract.paypal_auth_id,
            buyer_agent_id: contract.buyer_agent_id,
            worker_agent_id: contract.worker_agent_id,
            audit_events_count: (this.state.audit_logs || []).filter((a) => a.contract_id === contract.id).length,
            requires_human_approval: false,
          },
        });
        continue;
      }

      for (const m of contract.milestones) {
        let paymentState: TransactionRecord['payment_state'] = 'Pending Review';
        if (m.status === 'ACCEPTED_SETTLED') paymentState = 'Captured';
        else if (m.status === 'VOIDED') paymentState = 'Voided';
        else if (contract.status === 'ESCROW_HELD' || contract.status === 'PARTIALLY_SETTLED') paymentState = 'Authorized';

        let verification: TransactionRecord['verification'] = 'Pending';
        if (m.verification_trace?.deterministic?.passed) {
          verification = m.verification_trace?.adversarial?.vetoed ? 'Vetoed' : 'Passed';
        } else if (m.rejection_reason) {
          verification = 'Rejected';
        }

        let risk: TransactionRecord['risk'] = 'Low';
        if (verification === 'Vetoed' || verification === 'Rejected') {
          risk = 'High';
        } else if (parseFloat(m.amount) > 100 || m.status === 'VERIFYING') {
          risk = 'Review Required';
        } else if (verification === 'Pending') {
          risk = 'Medium';
        }

        let aiAssessment = 'Recommendation Available';
        if (m.verification_trace?.adversarial?.vetoed) {
          aiAssessment = 'Adversarial Vetoed';
        } else if (verification === 'Passed') {
          aiAssessment = 'Verified Clear';
        }

        const receipt = Object.values(this.state.receipts || {}).find((r) => r.milestone_id === m.id);

        records.push({
          id: `TXN-${m.id.replace('ms_', '').slice(0, 8).toUpperCase()}`,
          contract_id: contract.id,
          milestone_id: m.id,
          title: m.title,
          provider: providerName,
          data_source: dataSource,
          is_simulated: isSimulated,
          amount: m.amount,
          currency: m.currency,
          payment_state: paymentState,
          verification,
          risk,
          ai_assessment: aiAssessment,
          reconciliation: m.paypal_capture_id ? 'Confirmed' : contract.status === 'VOIDED' ? 'Reconciled' : 'Pending Sync',
          updated_at: m.settled_at || contract.updated_at || contract.created_at,
          details: {
            paypal_order_id: contract.paypal_order_id,
            paypal_auth_id: contract.paypal_auth_id,
            paypal_capture_id: m.paypal_capture_id,
            buyer_agent_id: contract.buyer_agent_id,
            worker_agent_id: contract.worker_agent_id,
            deliverable_hash: m.deliverable_hash,
            receipt_id: receipt?.receipt_id,
            verification_trace: m.verification_trace,
            audit_events_count: (this.state.audit_logs || []).filter((a) => a.contract_id === contract.id).length,
            requires_human_approval: risk === 'Review Required' || risk === 'High',
          },
        });
      }
    }

    return records.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  clear() {
    this.state = { contracts: {}, receipts: {}, approvals: {}, audit_logs: [] };
    this.persist();
  }
}

export const db = new DataStore();
