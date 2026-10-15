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

  constructor(dbFileName = 'holdfast-store.json') {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, dbFileName);
    this.load();
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
    return this.state.contracts[id] || null;
  }

  getAllContracts(): Contract[] {
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
    return this.state.receipts[receiptId] || null;
  }

  getReceiptsForContract(contractId: string): AcceptanceReceipt[] {
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
    return this.state.audit_logs.slice(0, limit);
  }

  clear() {
    this.state = { contracts: {}, receipts: {}, audit_logs: [] };
    this.persist();
  }
}

export const db = new DataStore();
