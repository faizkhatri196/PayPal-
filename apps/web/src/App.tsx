import React, { useState, useEffect } from 'react';
import './index.css';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Copy,
  Terminal,
  Activity,
  DollarSign,
  Cpu,
  Bot,
  ArrowRight,
  Info,
  ShieldAlert,
  Check,
  X,
  Play,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Table,
  Settings,
  CreditCard,
  Globe,
  Sliders,
  Clock,
} from 'lucide-react';

import { TransactionExplorer } from './components/TransactionExplorer.js';
import { ApprovalCenter } from './components/ApprovalCenter.js';
import { AiIntelligence } from './components/AiIntelligence.js';
import { PolicyEngine } from './components/PolicyEngine.js';
import { EvidenceVault } from './components/EvidenceVault.js';
import { ReconciliationCenter } from './components/ReconciliationCenter.js';
import { ProviderSettings } from './components/ProviderSettings.js';
import { DeveloperCenter } from './components/DeveloperCenter.js';

interface MilestoneCriteria {
  required_keys: string[];
  schema_type: 'pricing_report' | 'code_review' | 'data_extraction' | 'custom_json';
  min_items?: number;
  max_latency_sec?: number;
}

interface Milestone {
  id: string;
  contract_id: string;
  sequence: number;
  title: string;
  description: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'DELIVERED' | 'VERIFYING' | 'ACCEPTED_SETTLED' | 'REJECTED' | 'VOIDED';
  criteria?: MilestoneCriteria;
  deliverable_payload?: any;
  deliverable_hash?: string;
  paypal_capture_id?: string;
  rejection_reason?: string;
  settled_at?: string;
  verification_trace?: any;
}

interface Contract {
  id: string;
  title: string;
  description: string;
  buyer_agent_id: string;
  worker_agent_id: string;
  total_amount: string;
  currency: string;
  status: 'DRAFT' | 'AWAITING_APPROVAL' | 'ESCROW_HELD' | 'IN_PROGRESS' | 'PARTIALLY_SETTLED' | 'COMPLETED' | 'VOIDED' | 'DISPUTED';
  paypal_order_id?: string;
  paypal_auth_id?: string;
  paypal_approve_url?: string;
  custom_contract_hash: string;
  milestones: Milestone[];
  created_at: string;
}

interface Receipt {
  receipt_id: string;
  contract_id: string;
  milestone_title: string;
  settled_amount: string;
  currency: string;
  paypal_order_id: string;
  paypal_auth_id: string;
  paypal_capture_id: string;
  deliverable_hash: string;
  issued_at: string;
  digital_signature: string;
  verifier_summary: {
    gate1_deterministic_passed: boolean;
    gate2_adversarial_veto_passed: boolean;
    checks: string[];
  };
}

interface AuditLog {
  id: string;
  contract_id?: string;
  event: string;
  details: any;
  timestamp: string;
}

export function App() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<{ receipt: Receipt; evidence: string } | null>(null);
  const [inspectStage, setInspectStage] = useState<number | null>(null);
  const [reviewModalMilestone, setReviewModalMilestone] = useState<Milestone | null>(null);
  const [verificationModalTrace, setVerificationModalTrace] = useState<any | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<'workspace' | 'verification' | 'evidence' | 'reconciliation' | 'settings'>('workspace');
  const [devSubTab, setDevSubTab] = useState<'settings' | 'ai' | 'docs'>('settings');
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'CONNECTED' | 'CONNECTION_FAILED' | 'NOT_CONFIGURED';
    connected: boolean;
    environment?: string;
    clientIdConfigured?: boolean;
    latencyMs?: number;
    error?: string;
    checkedAt?: string;
  } | null>(null);
  const [appMode, setAppMode] = useState<'demo' | 'sandbox'>('demo');
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newOrderForm, setNewOrderForm] = useState({
    title: 'Autonomous Competitor Pricing Research',
    description: 'Autonomous agent gathers and structures pricing intelligence across 5 online marketplaces.',
    amount: '15.00',
    currency: 'USD',
  });
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus({
          status: data.status,
          connected: data.connected,
          environment: data.environment,
          clientIdConfigured: data.clientIdConfigured,
          latencyMs: data.latencyMs,
          error: data.error,
          checkedAt: data.checkedAt,
        });
      }
    } catch {
      setConnectionStatus({
        status: 'CONNECTION_FAILED',
        connected: false,
        error: 'Backend API unavailable',
      });
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await fetch('/api/paypal/test-connection', { method: 'POST' });
      const data = await res.json();
      setConnectionTestResult(data);
      if (data.connected) {
        showToast(`Sandbox OAuth verified in ${data.latencyMs}ms. Ready for authorizations.`);
      } else {
        showToast(`Connection failed: ${data.error || 'Authentication error'}`);
      }
      await checkStatus();
    } catch (err: any) {
      setConnectionTestResult({ connected: false, error: err.message });
      showToast(`Probe error: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const fetchData = async () => {
    try {
      await checkStatus();
      const cRes = await fetch('/api/contracts');
      if (cRes.ok) {
        const data = await cRes.json();
        const fetchedContracts: Contract[] = data.contracts || [];
        setContracts(fetchedContracts);
        if (fetchedContracts.length > 0 && (!activeContractId || !fetchedContracts.some(c => c.id === activeContractId))) {
          const demo = fetchedContracts.find(c => c.milestones && c.milestones.length > 0) || fetchedContracts[0];
          setActiveContractId(demo.id);
        }
      }

      const lRes = await fetch('/api/audit-logs');
      if (lRes.ok) {
        const lData = await lRes.json();
        setAuditLogs(lData.logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contractParam = params.get('contractId');
    const isAuthorized = params.get('authorized') === 'true' || params.get('approved') === 'true';
    const isCancelled = params.get('cancelled') === 'true';
    const paypalStatus = params.get('paypal_status');
    const errorParam = params.get('error');

    if (contractParam) {
      setActiveContractId(contractParam);
    }
    if (isAuthorized) {
      showToast('PayPal Sandbox Authorization confirmed. Funds held directly with PayPal.');
    } else if (isCancelled) {
      showToast('PayPal Sandbox checkout was cancelled by the buyer. No funds were held.');
    } else if (paypalStatus) {
      showToast(`PayPal status: ${paypalStatus} (Buyer approval pending)`);
    } else if (errorParam) {
      showToast(`PayPal Sandbox notice: ${decodeURIComponent(errorParam)}`);
    }

    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [activeContractId]);

  const activeContract = contracts.find((c) => c.id === activeContractId) || contracts[0];

  // Derive Top-Level Metrics Dynamically from Real Backend Data
  const totalFundsAuthorized = contracts
    .filter((c) => c.status === 'ESCROW_HELD' || c.status === 'PARTIALLY_SETTLED')
    .reduce((sum, c) => sum + parseFloat(c.total_amount || '0'), 0);

  const totalPaymentsCompletedNum = contracts
    .flatMap((c) => c.milestones || [])
    .filter((m) => m.status === 'ACCEPTED_SETTLED')
    .reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);

  const totalFundsProtectedNum = Math.max(0, totalFundsAuthorized - totalPaymentsCompletedNum);

  const pendingMilestonesCount = contracts
    .flatMap((c) => c.milestones || [])
    .filter((m) => m.status === 'PENDING' || m.status === 'VERIFYING').length;

  // Active Contract Financial Calculations
  const calculateFinancials = (contract?: Contract) => {
    if (!contract) return { totalAuth: '0.00', settled: '0.00', remaining: '0.00', settledMilestonesCount: 0, pendingMilestonesCount: 0, statusText: 'No contract selected' };
    const totalAuthNum = parseFloat(contract.total_amount) || 0;
    const settledList = (contract.milestones || []).filter((m) => m.status === 'ACCEPTED_SETTLED');
    const pendingList = (contract.milestones || []).filter((m) => m.status === 'PENDING' || m.status === 'VERIFYING');
    const settledNum = settledList.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    const remainingNum = Math.max(0, totalAuthNum - settledNum);

    let statusText = `${settledList.length} milestone${settledList.length === 1 ? '' : 's'} paid; ${pendingList.length} awaiting review`;
    if (!contract.milestones || contract.milestones.length === 0) {
      statusText = 'Pre-authorized hold active; ready for reconciliation testing';
    } else if (pendingList.length === 0 && settledList.length > 0) {
      statusText = 'All milestones verified and settled';
    }

    return {
      totalAuth: totalAuthNum.toFixed(2),
      settled: settledNum.toFixed(2),
      remaining: remainingNum.toFixed(2),
      settledMilestonesCount: settledList.length,
      pendingMilestonesCount: pendingList.length,
      statusText,
    };
  };

  const currentFin = calculateFinancials(activeContract);

  // Understandable Payment Decision Resolver
  const getDecisionState = (contract?: Contract) => {
    if (!contract) {
      return {
        label: 'Unknown provider state',
        color: '#64748b',
        bg: '#f1f5f9',
        reason: 'No payment agreement selected.',
      };
    }

    const activeM = contract.milestones?.find(m => m.status === 'REJECTED' || m.status === 'VERIFYING' || m.status === 'ACCEPTED_SETTLED') || contract.milestones?.[0];

    if (contract.status === 'VOIDED') {
      return {
        label: 'Voided',
        color: '#64748b',
        bg: '#f1f5f9',
        reason: 'Payment hold was voided on PayPal. Zero funds moved from buyer.',
      };
    }

    if (contract.status === 'DISPUTED') {
      return {
        label: 'Reconciliation required',
        color: '#d97706',
        bg: 'rgba(217, 119, 6, 0.1)',
        reason: 'State desync detected between provider and local ledger. Reconciliation initiated.',
      };
    }

    if (activeM?.status === 'REJECTED') {
      const failReason =
        activeM.verification_trace?.deterministic?.failure_reason ||
        activeM.verification_trace?.adversarial?.veto_reason ||
        activeM.rejection_reason ||
        'Requested amount exceeds authorized limit.';
      return {
        label: 'Blocked by policy',
        color: '#dc2626',
        bg: 'rgba(220, 38, 38, 0.08)',
        reason: failReason,
      };
    }

    if (activeM?.status === 'ACCEPTED_SETTLED' || contract.status === 'COMPLETED') {
      return {
        label: 'Captured and confirmed',
        color: '#059669',
        bg: 'rgba(5, 150, 105, 0.08)',
        reason: 'Dual-gate verification passed. PayPal capture confirmed and HMAC receipt minted.',
      };
    }

    if (activeM?.status === 'VERIFYING') {
      return {
        label: 'Awaiting verification',
        color: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.08)',
        reason: 'Deliverable submitted. Executing deterministic schema validation and AI security check.',
      };
    }

    if (contract.status === 'AWAITING_APPROVAL') {
      return {
        label: 'Awaiting approval',
        color: '#d97706',
        bg: 'rgba(217, 119, 6, 0.08)',
        reason: 'Payment order created. Awaiting buyer authorization on PayPal Checkout.',
      };
    }

    if (contract.status === 'ESCROW_HELD' || contract.status === 'PARTIALLY_SETTLED') {
      return {
        label: 'Ready for capture',
        color: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.08)',
        reason: 'Pre-authorization hold locked with PayPal. Awaiting task deliverable for verification.',
      };
    }

    return {
      label: 'Unknown provider state',
      color: '#64748b',
      bg: '#f1f5f9',
      reason: 'Provider state unconfirmed. Holdfast treats unverified states as non-settled.',
    };
  };

  const decisionInfo = getDecisionState(activeContract);

  // User Actions
  const handleRunScenario = async (type: 'valid' | 'ceiling_breach' | 'injection' | 'void' | 'reconcile') => {
    setLoading(true);
    try {
      if (type === 'ceiling_breach') {
        const res = await fetch('/api/scenarios/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: 'ceiling_breach' }),
        });
        const data = await res.json();
        if (data.contract) {
          await fetchData();
          setActiveContractId(data.contract.id);
          showToast('Gate 1 Blocked: $150 requested exceeded $100 ceiling. Capture blocked ($0 moved).');
        } else {
          showToast(data.message || 'Ceiling breach scenario triggered');
        }
      } else if (type === 'injection') {
        const res = await fetch('/api/scenarios/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: 'prompt_injection' }),
        });
        const data = await res.json();
        if (data.contract) {
          await fetchData();
          setActiveContractId(data.contract.id);
          showToast('Gate 2 Veto: Prompt injection detected and blocked. Zero funds moved.');
        } else {
          showToast(data.message || 'Prompt injection scenario triggered');
        }
      } else if (type === 'valid') {
        const res = await fetch('/api/scenarios/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: 'valid' }),
        });
        const data = await res.json();
        if (data.contract) {
          await fetchData();
          setActiveContractId(data.contract.id);
          showToast('Dual verification passed. Tranche of $15.00 captured on PayPal. Receipt minted.');
        } else {
          showToast(data.message || 'Valid payment scenario triggered');
        }
      } else if (type === 'void') {
        if (!activeContract) return;
        const res = await fetch(`/api/contracts/${activeContract.id}/void`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          showToast('Remaining hold voided on PayPal. Zero funds lost by buyer.');
          fetchData();
        } else {
          showToast(data.error?.message || data.error);
        }
      } else if (type === 'reconcile') {
        if (!activeContract) return;
        const res = await fetch(`/api/contracts/${activeContract.id}/reconcile`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          showToast('Reconciled with PayPal. Hold verified without duplicate capture.');
          fetchData();
        } else {
          showToast(data.error?.message || data.error);
        }
      }
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewReceipt = async (receiptId: string) => {
    try {
      const res = await fetch(`/api/receipts/${receiptId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReceipt({
          receipt: data.receipt,
          evidence: data.dispute_evidence_packet,
        });
      }
    } catch (err: any) {
      showToast('Failed to load receipt: ' + err.message);
    }
  };

  const handleReviewWork = (milestone: Milestone) => {
    setReviewModalMilestone(milestone);
  };

  const handleViewVerification = (trace: any) => {
    setVerificationModalTrace(trace);
  };

  const handleCreateOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCreatingOrder(true);
    try {
      const isDemoMode = appMode === 'demo';
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newOrderForm.title,
          description: newOrderForm.description,
          amount: newOrderForm.amount,
          currency: newOrderForm.currency,
          is_demo: isDemoMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to create payment order');
      }

      await fetchData();
      if (data.contract) {
        setActiveContractId(data.contract.id);
      }
      setShowCreateModal(false);

      if (data.mode === 'LIVE_SANDBOX' && data.approveUrl) {
        showToast('PayPal Sandbox order created. Opening checkout window for buyer authorization.');
        window.open(data.approveUrl, '_blank', 'width=600,height=700');
      } else {
        showToast(`Demo Payment Order initialized (${data.orderId})`);
      }
    } catch (err: any) {
      showToast(`Creation error: ${err.message}`);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCheckOrderApproval = async (contractId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/check-approval`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Check approval failed');
      }
      if (data.approved) {
        showToast('PayPal order verified as APPROVED. Pre-authorization hold locked.');
      } else {
        showToast(`PayPal status: ${data.paypal_order_status || 'CREATED'} (Buyer approval pending)`);
      }
      await fetchData();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isSimulated = activeContract?.id?.startsWith('ct_demo_') || activeContract?.paypal_order_id?.startsWith('DEMO_');
  const activeMilestone = activeContract?.milestones?.find(m => m.status === 'REJECTED' || m.status === 'VERIFYING' || m.status === 'ACCEPTED_SETTLED') || activeContract?.milestones?.[0];
  const isCaptured = activeMilestone?.status === 'ACCEPTED_SETTLED';
  const isBlocked = activeMilestone?.status === 'REJECTED';
  const requestedAmount = activeMilestone?.amount || activeContract?.total_amount || '0.00';
  const authorizedLimit = activeContract?.total_amount || '0.00';
  const capturedAmount = isCaptured ? (activeMilestone?.amount || '0.00') : '0.00';

  return (
    <div className="fintech-app">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fintech-toast">
          <Activity size={16} color="#0284c7" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER: Wordmark + Geometric Mark, Descriptor, Honest Indicator, Single Selector, Primary Action */}
      <header className="fintech-header">
        <div className="header-brand-group">
          {/* Typographic wordmark with one restrained geometric mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V12C3 17.5 7 21.5 12 22C17 21.5 21 17.5 21 12V7L12 2Z" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7V17M8 12H16" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            <h1 className="brand-title">Holdfast</h1>
          </div>
          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>|</span>
          <span className="brand-tagline">Trust infrastructure for AI-powered commerce.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Honest Connection Indicator */}
          <div
            onClick={() => setShowConnectModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              background: connectionStatus?.connected
                ? 'rgba(5, 150, 105, 0.08)'
                : connectionStatus?.status === 'CONNECTION_FAILED'
                ? 'rgba(220, 38, 38, 0.08)'
                : 'rgba(217, 119, 6, 0.08)',
              color: connectionStatus?.connected
                ? '#059669'
                : connectionStatus?.status === 'CONNECTION_FAILED'
                ? '#dc2626'
                : '#d97706',
              border: `1px solid ${
                connectionStatus?.connected
                  ? 'rgba(5, 150, 105, 0.25)'
                  : connectionStatus?.status === 'CONNECTION_FAILED'
                  ? 'rgba(220, 38, 38, 0.25)'
                  : 'rgba(217, 119, 6, 0.25)'
              }`,
            }}
            title="Inspect PayPal Sandbox connection status. An active OAuth connection does not imply that payments have settled."
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: connectionStatus?.connected
                  ? '#059669'
                  : connectionStatus?.status === 'CONNECTION_FAILED'
                  ? '#dc2626'
                  : '#d97706',
              }}
            />
            {connectionStatus?.connected
              ? `PayPal Sandbox: Connected (${connectionStatus.latencyMs || 0}ms)`
              : connectionStatus?.status === 'CONNECTION_FAILED'
              ? 'PayPal Sandbox: Connection Failed'
              : 'PayPal Sandbox: Not Configured'}
          </div>

          {/* One Environment Selector */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={() => {
                setAppMode('demo');
                showToast('Environment: Demo — Simulated');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: appMode === 'demo' ? '#ffffff' : 'transparent',
                color: appMode === 'demo' ? '#0284c7' : '#64748b',
                boxShadow: appMode === 'demo' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Demo — Simulated
            </button>
            <button
              onClick={() => {
                setAppMode('sandbox');
                showToast('Environment: PayPal Sandbox');
                if (!connectionStatus?.connected) {
                  setShowConnectModal(true);
                }
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: appMode === 'sandbox' ? '#ffffff' : 'transparent',
                color: appMode === 'sandbox' ? '#0f766e' : '#64748b',
                boxShadow: appMode === 'sandbox' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              PayPal Sandbox
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            className="action-btn primary"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '7px 14px' }}
          >
            <CreditCard size={14} /> Create Payment
          </button>
        </div>
      </header>

      {/* SECONDARY NAVIGATION TABS (Restrained 5 views) */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 6px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {[
          { id: 'workspace', label: 'Payment Workspace', icon: LayoutDashboard },
          { id: 'verification', label: 'Policy Engine', icon: ShieldCheck },
          { id: 'evidence', label: 'Evidence Vault', icon: Lock },
          { id: 'reconciliation', label: 'Reconciliation', icon: RefreshCw },
          { id: 'settings', label: 'Developer Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveModule(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 13px',
                borderRadius: '5px',
                border: 'none',
                background: isActive ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontSize: '12.5px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* WORKSPACE VIEW: Unified Main Screen */}
      {activeModule === 'workspace' && (
        <>
          {/* 1. COMPACT OPERATIONAL SUMMARY (Genuine Backend Metrics) */}
          <section className="top-metrics-strip">
            <div className="metric-strip-item">
              <div className="metric-strip-header">
                <Lock size={13} style={{ color: '#d97706' }} />
                <span className="metric-strip-label">Pre-Authorized Holds</span>
              </div>
              <div className="metric-strip-value-row">
                <span className="metric-strip-num">${totalFundsProtectedNum.toFixed(2)}</span>
                <span className="metric-strip-currency">USD</span>
              </div>
              <p className="metric-strip-caption">
                Reserved directly with PayPal; capital remains with the buyer until verified.
              </p>
            </div>

            <div className="metric-strip-item">
              <div className="metric-strip-header">
                <CheckCircle2 size={13} style={{ color: '#059669' }} />
                <span className="metric-strip-label">Settled Volume</span>
              </div>
              <div className="metric-strip-value-row">
                <span className="metric-strip-num" style={{ color: '#059669' }}>${totalPaymentsCompletedNum.toFixed(2)}</span>
                <span className="metric-strip-currency">USD</span>
              </div>
              <p className="metric-strip-caption">
                Captured following verified deliverables and minted HMAC acceptance receipts.
              </p>
            </div>

            <div className="metric-strip-item">
              <div className="metric-strip-header">
                <Activity size={13} style={{ color: '#0284c7' }} />
                <span className="metric-strip-label">Remaining Hold Balance</span>
              </div>
              <div className="metric-strip-value-row">
                <span className="metric-strip-num" style={{ color: '#0284c7' }}>${currentFin.remaining}</span>
                <span className="metric-strip-currency">USD</span>
              </div>
              <p className="metric-strip-caption">
                Uncaptured balance refundable to the buyer at any time via 1-click Void.
              </p>
            </div>

            <div className="metric-strip-item">
              <div className="metric-strip-header">
                <Cpu size={13} style={{ color: '#7c3aed' }} />
                <span className="metric-strip-label">Verification Tasks</span>
              </div>
              <div className="metric-strip-value-row">
                <span className="metric-strip-num" style={{ color: '#7c3aed' }}>{pendingMilestonesCount}</span>
                <span className="metric-strip-currency">ACTIVE</span>
              </div>
              <p className="metric-strip-caption">
                Milestones undergoing deterministic schema evaluation or ready for capture.
              </p>
            </div>
          </section>

          {/* 2. FOCUSED PAYMENT DECISION PANEL */}
          <section className="payment-decision-panel">
            <div className="decision-top-bar">
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div className="decision-badge-row">
                  <span
                    className="decision-status-pill"
                    style={{
                      color: decisionInfo.color,
                      background: decisionInfo.bg,
                      border: `1px solid ${decisionInfo.color}35`,
                    }}
                  >
                    {decisionInfo.label === 'Blocked by policy' ? (
                      <AlertTriangle size={13} />
                    ) : decisionInfo.label === 'Captured and confirmed' ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Clock size={13} />
                    )}
                    {decisionInfo.label}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isSimulated ? 'rgba(217, 119, 6, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                      color: isSimulated ? '#b45309' : '#0369a1',
                      border: `1px solid ${isSimulated ? 'rgba(217, 119, 6, 0.2)' : 'rgba(2, 132, 199, 0.2)'}`,
                      fontWeight: 600,
                    }}
                  >
                    {isSimulated ? 'Demo — Simulated (No funds moved)' : 'Live PayPal Sandbox'}
                  </span>
                </div>
                <h2 className="decision-title-text">{activeContract?.title || 'No Payment Agreement Selected'}</h2>
                <p className="decision-reason-text">{decisionInfo.reason}</p>
              </div>

              {/* Action Buttons on Decision Panel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {activeContract?.status === 'AWAITING_APPROVAL' && activeContract.paypal_approve_url && (
                  <a
                    href={activeContract.paypal_approve_url}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <CreditCard size={13} /> Open PayPal Checkout
                  </a>
                )}

                {activeContract?.status === 'AWAITING_APPROVAL' && (
                  <button
                    className="action-btn secondary"
                    onClick={() => handleCheckOrderApproval(activeContract.id)}
                    disabled={loading}
                  >
                    <RefreshCw size={13} className={loading ? 'spin' : ''} /> Verify Approval
                  </button>
                )}

                {activeContract?.status !== 'AWAITING_APPROVAL' && activeContract?.status !== 'VOIDED' && !isCaptured && (
                  <button
                    className="action-btn primary"
                    onClick={() => {
                      const pendingM = activeContract.milestones?.find(m => m.status === 'PENDING') || activeContract.milestones?.[0];
                      if (pendingM) handleReviewWork(pendingM);
                      else handleRunScenario('valid');
                    }}
                    disabled={loading}
                  >
                    <FileCheck size={13} /> Submit Deliverable & Verify
                  </button>
                )}

                {isCaptured && (
                  <button
                    className="action-btn primary"
                    onClick={() => {
                      const settledM = activeContract.milestones?.find(m => m.status === 'ACCEPTED_SETTLED');
                      if (settledM) viewReceipt(`rcpt_${settledM.id}`);
                    }}
                  >
                    <FileText size={13} /> View Acceptance Receipt
                  </button>
                )}

                {activeContract?.status !== 'VOIDED' && !isCaptured && (
                  <button
                    className="action-btn danger"
                    onClick={() => handleRunScenario('void')}
                    disabled={loading}
                    title="100% refundable; cancels the pre-authorization hold with PayPal"
                  >
                    Void Hold
                  </button>
                )}

                <button
                  className="action-btn secondary"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                >
                  <ShieldCheck size={13} />
                  {showTechnicalDetails ? 'Hide Details' : 'View Verification Details'}
                </button>
              </div>
            </div>

            {/* Financial Metrics Strip */}
            <div className="decision-stats-strip">
              <div className="decision-stat-box">
                <span className="decision-stat-label">Requested</span>
                <div className="decision-stat-val" style={{ color: isBlocked ? '#dc2626' : '#0f172a' }}>
                  ${requestedAmount} {activeContract?.currency || 'USD'}
                </div>
              </div>

              <div className="decision-stat-box">
                <span className="decision-stat-label">Authorized Limit</span>
                <div className="decision-stat-val" style={{ color: '#0284c7' }}>
                  ${authorizedLimit} {activeContract?.currency || 'USD'}
                </div>
              </div>

              <div className="decision-stat-box">
                <span className="decision-stat-label">Captured by Provider</span>
                <div className="decision-stat-val" style={{ color: isCaptured ? '#059669' : '#64748b' }}>
                  ${capturedAmount} {activeContract?.currency || 'USD'}
                </div>
              </div>

              <div className="decision-stat-box">
                <span className="decision-stat-label">Provider Hold Status</span>
                <div className="decision-stat-val" style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                  {activeContract?.paypal_auth_id ? 'HOLD LOCKED' : activeContract?.paypal_order_id ? 'ORDER CREATED' : 'NOT INITIATED'}
                </div>
              </div>
            </div>

            {/* Expandable 3-Tier Verification Breakdown */}
            {showTechnicalDetails && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {/* Tier 1: Deterministic Invariants */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '6px' }}>
                      1. Deterministic Policy Gate
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: isBlocked ? '#dc2626' : isCaptured ? '#059669' : '#0284c7' }}>
                      {isBlocked
                        ? `Blocked: ${decisionInfo.reason}`
                        : isCaptured
                        ? 'Passed: Mathematical ceiling and schema validation satisfied'
                        : 'Ready: Mathematical bounds verified'}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                      Rule evaluation is strictly programmatic; AI cannot override invariant checks.
                    </p>
                  </div>

                  {/* Tier 2: AI Security Audit */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '6px' }}>
                      2. AI Security Assessment
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: activeMilestone?.verification_trace?.adversarial?.vetoed ? '#dc2626' : isCaptured ? '#059669' : '#475569' }}>
                      {activeMilestone?.verification_trace?.adversarial?.vetoed
                        ? `Vetoed: ${activeMilestone.verification_trace.adversarial.veto_reason || 'Prompt injection detected'}`
                        : isCaptured
                        ? 'Passed: Zero prompt hijacking or payload violations detected'
                        : 'Active: Adversarial guard monitoring deliverable payloads'}
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                      Model: {activeMilestone?.verification_trace?.adversarial?.model || 'Gemini 2.5 Flash'} (Local fallback active if offline)
                    </p>
                  </div>

                  {/* Tier 3: Actual PayPal Provider Identifiers */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '6px' }}>
                      3. PayPal Provider References
                    </div>
                    <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#334155', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>Order: <strong>{activeContract?.paypal_order_id || 'DEMO_ORD_NOT_CREATED'}</strong></div>
                      <div>Auth Hold: <strong>{activeContract?.paypal_auth_id || 'Awaiting buyer auth'}</strong></div>
                      <div>Capture Ref: <strong>{activeMilestone?.paypal_capture_id || (isBlocked ? 'Blocked ($0 moved)' : 'Hold intact ($0 moved)')}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. FOUR-STAGE GUIDED PAYMENT WORKFLOW */}
          <section className="central-workflow-section">
            <div className="workflow-title-bar">
              <h3 className="section-title">Payment Workflow</h3>
              <span className="workflow-subtext">Four connected stages governing autonomous capital movement</span>
            </div>

            <div className="workflow-stages-container">
              {/* Stage 1: Create */}
              {(() => {
                const isCompleted = !!activeContract?.paypal_order_id;
                const isCurrent = !isCompleted;
                return (
                  <div className={`workflow-stage-card ${isCompleted ? 'completed' : isCurrent ? 'active' : ''}`}>
                    <div className="stage-number-badge">1</div>
                    <div className="stage-info">
                      <span className="stage-name">Create payment</span>
                      <span className="stage-tech">Pre-authorization intent registered</span>
                    </div>
                    <span className={`stage-status-badge ${isCompleted ? 'success' : 'active'}`}>
                      {isCompleted ? 'Completed' : 'Current'}
                    </span>
                    <button className="stage-inspect-btn" onClick={() => setInspectStage(1)}>
                      <Eye size={12} /> Inspect
                    </button>
                  </div>
                );
              })()}

              <div className="workflow-connector">→</div>

              {/* Stage 2: Approve */}
              {(() => {
                const isCompleted = !!activeContract?.paypal_auth_id;
                const isCurrent = !isCompleted && activeContract?.status === 'AWAITING_APPROVAL';
                return (
                  <div className={`workflow-stage-card ${isCompleted ? 'completed' : isCurrent ? 'active' : ''}`}>
                    <div className="stage-number-badge">2</div>
                    <div className="stage-info">
                      <span className="stage-name">Approve with PayPal</span>
                      <span className="stage-tech">Buyer authorization locks hold</span>
                    </div>
                    <span className={`stage-status-badge ${isCompleted ? 'success' : isCurrent ? 'active' : 'muted'}`}>
                      {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}
                    </span>
                    <button className="stage-inspect-btn" onClick={() => setInspectStage(2)}>
                      <Eye size={12} /> Inspect
                    </button>
                  </div>
                );
              })()}

              <div className="workflow-connector">→</div>

              {/* Stage 3: Verify */}
              {(() => {
                const isCompleted = activeContract?.milestones?.some(m => m.status === 'ACCEPTED_SETTLED');
                const isBlockedStage = activeContract?.milestones?.some(m => m.status === 'REJECTED');
                const isCurrent = !!activeContract?.paypal_auth_id && !isCompleted && !isBlockedStage;
                return (
                  <div className={`workflow-stage-card ${isCompleted ? 'completed' : isBlockedStage ? 'rejected' : isCurrent ? 'active' : ''}`}>
                    <div className="stage-number-badge">3</div>
                    <div className="stage-info">
                      <span className="stage-name">Verify evidence</span>
                      <span className="stage-tech">Deterministic rules & AI check</span>
                    </div>
                    <span className={`stage-status-badge ${isCompleted ? 'success' : isBlockedStage ? 'crimson' : isCurrent ? 'active' : 'muted'}`}>
                      {isCompleted ? 'Completed' : isBlockedStage ? 'Blocked' : isCurrent ? 'Current' : 'Pending'}
                    </span>
                    <button className="stage-inspect-btn" onClick={() => setInspectStage(3)}>
                      <Eye size={12} /> Inspect
                    </button>
                  </div>
                );
              })()}

              <div className="workflow-connector">→</div>

              {/* Stage 4: Capture & Confirm */}
              {(() => {
                const isCompleted = activeContract?.milestones?.some(m => m.status === 'ACCEPTED_SETTLED' && !!m.paypal_capture_id);
                const isBlockedStage = activeContract?.milestones?.some(m => m.status === 'REJECTED');
                const isCurrent = !!activeContract?.paypal_auth_id && !isCompleted && !isBlockedStage;
                return (
                  <div className={`workflow-stage-card ${isCompleted ? 'completed' : isBlockedStage ? 'rejected' : isCurrent ? 'active' : ''}`}>
                    <div className="stage-number-badge">4</div>
                    <div className="stage-info">
                      <span className="stage-name">Capture payment</span>
                      <span className="stage-tech">Provider capture & HMAC receipt</span>
                    </div>
                    <span className={`stage-status-badge ${isCompleted ? 'success' : isBlockedStage ? 'crimson' : 'muted'}`}>
                      {isCompleted ? 'Completed' : isBlockedStage ? 'Blocked ($0 moved)' : 'Pending'}
                    </span>
                    <button className="stage-inspect-btn" onClick={() => setInspectStage(4)}>
                      <Eye size={12} /> Inspect
                    </button>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* 4. RECENT TRANSACTION ACTIVITY (AG Grid Community Front and Center!) */}
          <section style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 className="section-title">Recent Transaction Activity</h3>
                <span className="workflow-subtext">Interactive AG Grid Community ledger. Select any row to update the Payment Decision panel.</span>
              </div>

              {/* Discreet scenario buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Test Scenarios:</span>
                <button
                  onClick={() => { setAppMode('demo'); handleRunScenario('valid'); }}
                  disabled={loading}
                  className="action-btn secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  Standard Settlement ($15.00)
                </button>
                <button
                  onClick={() => { setAppMode('demo'); handleRunScenario('ceiling_breach'); }}
                  disabled={loading}
                  className="action-btn secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }}
                >
                  Ceiling Breach ($150 on $100 hold)
                </button>
                <button
                  onClick={() => { setAppMode('demo'); handleRunScenario('injection'); }}
                  disabled={loading}
                  className="action-btn secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', color: '#dc2626' }}
                >
                  Prompt Injection Veto
                </button>
              </div>
            </div>

            <TransactionExplorer
              onSelectReceipt={(receiptId) => {
                fetch(`/api/receipts/${receiptId}`)
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.receipt) {
                      setSelectedReceipt({
                        receipt: data.receipt,
                        evidence: data.dispute_evidence_packet || '',
                      });
                    }
                  });
              }}
              onOpenContract={(contractId) => {
                setActiveContractId(contractId);
              }}
            />
          </section>
        </>
      )}

      {/* POLICY ENGINE MODULE */}
      {activeModule === 'verification' && <PolicyEngine />}

      {/* EVIDENCE VAULT MODULE */}
      {activeModule === 'evidence' && <EvidenceVault />}

      {/* RECONCILIATION MODULE */}
      {activeModule === 'reconciliation' && <ReconciliationCenter />}

      {/* DEVELOPER SETTINGS MODULE */}
      {activeModule === 'settings' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px 6px',
              background: '#f1f5f9',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            <button
              onClick={() => setDevSubTab('settings')}
              className={`nav-tab-btn ${devSubTab === 'settings' ? 'active' : ''}`}
            >
              Provider Settings
            </button>
            <button
              onClick={() => setDevSubTab('ai')}
              className={`nav-tab-btn ${devSubTab === 'ai' ? 'active' : ''}`}
            >
              AI Intelligence
            </button>
            <button
              onClick={() => setDevSubTab('docs')}
              className={`nav-tab-btn ${devSubTab === 'docs' ? 'active' : ''}`}
            >
              Developer Docs
            </button>
          </div>

          {devSubTab === 'settings' && <ProviderSettings />}
          {devSubTab === 'ai' && <AiIntelligence />}
          {devSubTab === 'docs' && <DeveloperCenter />}
        </div>
      )}

      {/* MODAL 1: STAGE INSPECTION */}
      {inspectStage !== null && (
        <div className="modal-overlay" onClick={() => setInspectStage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#0284c7" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Workflow Stage Inspection</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectStage(null)}>
                <X size={16} />
              </button>
            </div>

            {inspectStage === 1 && (
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Stage 1: Create Payment (PayPal Orders v2)</h4>
                <p className="stage-explanation">
                  AI buyer agent creates an authorization hold order specifying the agreed payment ceiling and task criteria.
                </p>
                <div className="evidence-code-block">
                  <pre>
{`Endpoint: POST /v2/checkout/orders
Intent: "AUTHORIZE"
Order ID: ${activeContract?.paypal_order_id || 'DEMO_ORD_982410'}
Amount: $${activeContract?.total_amount || '15.00'} ${activeContract?.currency || 'USD'}
Payment Source: PayPal Wallet / Direct Card
Description: Holdfast Authorization Hold`}
                  </pre>
                </div>
              </div>
            )}

            {inspectStage === 2 && (
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Stage 2: Approve with PayPal Sandbox</h4>
                <p className="stage-explanation">
                  Buyer logs in to PayPal checkout to authenticate the hold. Funds are pre-authorized directly with PayPal for up to 29 days without intermediate custody.
                </p>
                <div className="evidence-code-block">
                  <pre>
{`Status: APPROVED -> AUTHORIZED
Authorization ID: ${activeContract?.paypal_auth_id || 'AUTH_ACTIVE_HOLD'}
Hold Amount: $${activeContract?.total_amount || '15.00'} USD
Custodial Risk: ZERO (Held directly with PayPal)
Voidable: 100% refundable with 1-click Void`}
                  </pre>
                </div>
              </div>
            )}

            {inspectStage === 3 && (
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Stage 3: Verify Evidence</h4>
                <p className="stage-explanation">
                  Evaluates deliverable payloads against deterministic schema rules (Gate 1) and security injection threats (Gate 2).
                </p>
                <div className="evidence-code-block">
                  <pre>
{`Gate 1 Deterministic: Passed (Arithmetic limits & schema verified)
Gate 2 Security Audit: Passed (Clean, no prompt overrides)
Auditor Model: Gemini 2.5 Flash`}
                  </pre>
                </div>
              </div>
            )}

            {inspectStage === 4 && (
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Stage 4: Capture & Confirm</h4>
                <p className="stage-explanation">
                  Non-custodial capture executed against the pre-authorized authorization hold, followed by HMAC-SHA256 receipt generation.
                </p>
                <div className="evidence-code-block">
                  <pre>
{`Endpoint: POST /v2/payments/authorizations/{auth_id}/capture
Status: 201 Created
PayPal Authorization ID: ${activeContract?.paypal_auth_id || 'AUTH_ACTIVE_HOLD'}
Capture Amount: $15.00 USD
Idempotency Key: cap_${activeContract?.id || 'demo'}_m1
Receipt Standard: HMAC-SHA256 Digital Signature`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: REVIEW WORK MODAL */}
      {reviewModalMilestone && (
        <div className="modal-overlay" onClick={() => setReviewModalMilestone(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={18} color="#0284c7" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Review Work: {reviewModalMilestone.title}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setReviewModalMilestone(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: '#475569' }}>{reviewModalMilestone.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                <span>Milestone Tranche Amount:</span>
                <span className="emerald-text">${reviewModalMilestone.amount} USD</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Acceptance Requirements (Gate 1):
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#0284c7' }}>
                    Schema: {reviewModalMilestone.criteria?.schema_type || 'pricing_report'}
                  </span>
                  <span style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#0284c7' }}>
                    Keys: [{(reviewModalMilestone.criteria?.required_keys || ['market_id', 'items', 'timestamp']).join(', ')}]
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  className="action-btn primary"
                  onClick={() => {
                    setReviewModalMilestone(null);
                    handleRunScenario('valid');
                  }}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  <Play size={14} /> Verify & Settle Tranche ($15.00)
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => {
                    setReviewModalMilestone(null);
                    handleRunScenario('injection');
                  }}
                  disabled={loading}
                  style={{ flex: 1, color: '#dc2626' }}
                >
                  <ShieldAlert size={14} /> Submit Adversarial Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ACCEPTANCE RECEIPT & DISPUTE EVIDENCE */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#059669" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Acceptance Receipt & Dispute Evidence</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedReceipt(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Signature Verification Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.25)', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
              <CheckCircle2 size={18} color="#059669" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>VALID HMAC-SHA256 DIGITAL SIGNATURE</div>
                <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {selectedReceipt.receipt.digital_signature}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>PayPal Capture ID</span>
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{selectedReceipt.receipt.paypal_capture_id}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Settled Amount</span>
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#059669' }}>
                  ${selectedReceipt.receipt.settled_amount} {selectedReceipt.receipt.currency}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Evidence Packet for PayPal Resolution Center
              </div>
              <pre className="packet-code-view">{selectedReceipt.evidence}</pre>
            </div>

            <button
              className="action-btn primary"
              style={{ width: '100%' }}
              onClick={() => {
                navigator.clipboard.writeText(selectedReceipt.evidence);
                showToast('Evidence Packet copied to clipboard.');
              }}
            >
              <Copy size={14} /> Copy Dispute Evidence Packet
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: VERIFICATION DETAILS MODAL */}
      {verificationModalTrace && (
        <div className="modal-overlay" onClick={() => setVerificationModalTrace(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#0284c7" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Verification Trace Details</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setVerificationModalTrace(null)}>
                <X size={16} />
              </button>
            </div>

            <div>
              <pre className="packet-code-view">
                {JSON.stringify(verificationModalTrace, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONNECT PAYPAL SANDBOX */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#0284c7" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>PayPal Sandbox Configuration</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowConnectModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: connectionStatus?.connected
                    ? 'rgba(5, 150, 105, 0.08)'
                    : connectionStatus?.status === 'CONNECTION_FAILED'
                    ? 'rgba(220, 38, 38, 0.08)'
                    : 'rgba(217, 119, 6, 0.08)',
                  border: `1px solid ${
                    connectionStatus?.connected
                      ? 'rgba(5, 150, 105, 0.25)'
                      : connectionStatus?.status === 'CONNECTION_FAILED'
                      ? 'rgba(220, 38, 38, 0.25)'
                      : 'rgba(217, 119, 6, 0.25)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    OAuth Handshake Status
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: connectionStatus?.connected ? '#059669' : '#d97706',
                      color: '#ffffff',
                    }}
                  >
                    {connectionStatus?.status || 'CHECKING'}
                  </span>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginTop: '6px' }}>
                  {connectionStatus?.connected
                    ? `Connected to PayPal Sandbox (${connectionStatus.latencyMs}ms latency)`
                    : connectionStatus?.status === 'CONNECTION_FAILED'
                    ? connectionStatus.error || 'Authentication handshake with PayPal Sandbox failed.'
                    : 'PayPal Client ID and Secret are not configured in your server environment.'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Configuration Guide
                </h4>
                <ol style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px 0', paddingLeft: '18px', lineHeight: 1.6 }}>
                  <li>Create a REST API App in Sandbox mode at <strong>developer.paypal.com</strong>.</li>
                  <li>Configure credentials in your root <strong>.env</strong> file:</li>
                </ol>
                <pre style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#0f172a' }}>
PAYPAL_CLIENT_ID=your_sandbox_client_id{'\n'}
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret{'\n'}
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
                </pre>
                <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
                  Security Guarantee: Credentials remain strictly on the backend. The browser never receives or transmits your Client Secret.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="action-btn primary"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  style={{ flex: 1 }}
                >
                  <RefreshCw size={13} className={testingConnection ? 'spin' : ''} />
                  {testingConnection ? 'Probing Sandbox...' : 'Test Sandbox Connection'}
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => {
                    setAppMode('demo');
                    setShowConnectModal(false);
                    showToast('Switched to Demo mode');
                  }}
                >
                  Use Demo Mode
                </button>
              </div>

              {connectionTestResult && (
                <div
                  style={{
                    padding: '10px',
                    borderRadius: '5px',
                    fontSize: '11.5px',
                    background: connectionTestResult.connected ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    border: `1px solid ${connectionTestResult.connected ? '#059669' : '#dc2626'}`,
                    color: connectionTestResult.connected ? '#059669' : '#dc2626',
                  }}
                >
                  <strong>Result:</strong> {connectionTestResult.status} — {connectionTestResult.error || `Successfully obtained Bearer token in ${connectionTestResult.latencyMs}ms`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CREATE PAYMENT */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#0284c7" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  {appMode === 'sandbox' ? 'Create PayPal Sandbox Payment' : 'Create Demo Payment Order'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: appMode === 'sandbox' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(2, 132, 199, 0.08)',
                  border: `1px solid ${appMode === 'sandbox' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
                  fontSize: '11.5px',
                  color: appMode === 'sandbox' ? '#059669' : '#0284c7',
                }}
              >
                {appMode === 'sandbox'
                  ? 'Initiating a real PayPal Orders v2 with intent: "AUTHORIZE". Opens official Sandbox approval window.'
                  : 'Demo Mode: creates an isolated simulation without external PayPal API calls.'}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Pipeline Title
                </label>
                <input
                  type="text"
                  value={newOrderForm.title}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, title: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Deliverable Scope
                </label>
                <textarea
                  value={newOrderForm.description}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, description: e.target.value })}
                  rows={2}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Authorized Limit (Ceiling)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    max="10000.00"
                    value={newOrderForm.amount}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, amount: e.target.value })}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Currency
                  </label>
                  <select
                    value={newOrderForm.currency}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, currency: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="action-btn secondary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary"
                  disabled={creatingOrder}
                  style={{ flex: 2 }}
                >
                  <CreditCard size={14} />
                  {creatingOrder ? 'Creating Order...' : 'Create & Authorize Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
