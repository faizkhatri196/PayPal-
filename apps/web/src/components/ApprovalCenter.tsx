import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  RefreshCw,
  Info,
  DollarSign,
  FileText,
  Lock,
} from 'lucide-react';

interface ApprovalRequest {
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

export function ApprovalCenter() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approverIdentity, setApproverIdentity] = useState<string>('sec_lead_sarah@holdfast.local');
  const [role, setRole] = useState<string>('Security Operations Lead');
  const [rationale, setRationale] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
        if (!selectedApproval && data.approvals && data.approvals.length > 0) {
          setSelectedApproval(data.approvals[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (action: 'approve' | 'reject') => {
    if (!selectedApproval) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: approverIdentity,
          role,
          rationale: rationale || `Operational ${action} recorded by ${role}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback(`Successfully ${action === 'approve' ? 'approved' : 'rejected'} operation ${selectedApproval.id}`);
        setRationale('');
        await fetchApprovals();
        if (data.approval) {
          setSelectedApproval(data.approval);
        }
      } else {
        const errData = await res.json();
        setFeedback(`Failed: ${errData.error?.message || 'Authorization rejected'}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'PENDING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Overview */}
      <div
        style={{
          background: '#0f172a',
          padding: '18px 24px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.05em' }}>
            HUMAN-IN-THE-LOOP GOVERNANCE
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
            Operational Approval Center
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            High-value tranches, anomalous AI findings, and policy overrides require authenticated cryptographic sign-off before settlement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div
            style={{
              background: '#080d1a',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #334155',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b' }}>Pending Reviews</span>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>
              {pendingApprovals.length}
            </p>
          </div>
          <div
            style={{
              background: '#080d1a',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #334155',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b' }}>Resolved Actions</span>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
              {resolvedApprovals.length}
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            background: feedback.startsWith('Failed') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: feedback.startsWith('Failed') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
            color: feedback.startsWith('Failed') ? '#ef4444' : '#10b981',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Main Approval Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '20px' }}>
        {/* Approvals List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
              Pending Operations Requiring Sign-Off ({pendingApprovals.length})
            </h3>
            <button
              onClick={fetchApprovals}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>

          {approvals.length === 0 ? (
            <div
              style={{
                background: '#0f172a',
                padding: '30px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
              <p>All operational approvals are current. Zero pending reviews.</p>
            </div>
          ) : (
            approvals.map((appr) => {
              const isSelected = selectedApproval?.id === appr.id;
              const isPending = appr.status === 'PENDING';
              return (
                <div
                  key={appr.id}
                  onClick={() => setSelectedApproval(appr)}
                  style={{
                    background: isSelected ? '#1e293b' : '#0f172a',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                    padding: '16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>
                        {appr.id}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            appr.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : appr.status === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            appr.status === 'APPROVED'
                              ? '#10b981'
                              : appr.status === 'REJECTED'
                              ? '#ef4444'
                              : '#f59e0b',
                          fontWeight: 600,
                        }}
                      >
                        {appr.status}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Role: {appr.required_role}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {appr.operation} — {appr.contract_title}
                    </p>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Initiated by {appr.requested_by} • {appr.ai_recommendation_summary}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>
                      {appr.currency} {parseFloat(appr.amount).toFixed(2)}
                    </span>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(appr.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Approval Inspector & Decision Box */}
        {selectedApproval && (
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                APPROVAL WORKFLOW DETAILS
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                {selectedApproval.operation}
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                {selectedApproval.contract_title}
              </p>
            </div>

            {/* Amount Summary */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                background: '#080d1a',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Operation Amount</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                  {selectedApproval.currency} {parseFloat(selectedApproval.amount).toFixed(2)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>AI Risk Severity</span>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: selectedApproval.ai_risk_severity === 'critical' ? '#ef4444' : '#f59e0b',
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedApproval.ai_risk_severity}
                </p>
              </div>
            </div>

            {/* Policy Checks Evaluated */}
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                POLICY CHECKS EVALUATED
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {selectedApproval.policy_checks.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#1e293b',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {c.passed ? (
                      <CheckCircle2 size={13} color="#10b981" />
                    ) : (
                      <AlertTriangle size={13} color="#f59e0b" />
                    )}
                    <div>
                      <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>
                        {c.code}:
                      </span>{' '}
                      <span style={{ color: '#f8fafc' }}>{c.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation Summary */}
            <div
              style={{
                background: '#080d1a',
                border: '1px solid #1e293b',
                padding: '12px',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748b' }}>AI Intelligence Insight</span>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {selectedApproval.ai_recommendation_summary}
              </p>
            </div>

            {/* Sign-off Form */}
            {selectedApproval.status === 'PENDING' ? (
              <div
                style={{
                  background: '#080d1a',
                  border: '1px solid #334155',
                  padding: '16px',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                  <UserCheck size={14} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    Execute Authorized Sign-Off
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Authenticated Operator Identity
                  </label>
                  <input
                    type="text"
                    value={approverIdentity}
                    onChange={(e) => setApproverIdentity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Decision Rationale / Evidence Note
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter justification for sign-off or rejection..."
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: '#f8fafc',
                      fontSize: '12px',
                      resize: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleResolve('approve')}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#080d1a',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Approve Operation
                  </button>

                  <button
                    onClick={() => handleResolve('reject')}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <XCircle size={14} />
                    Reject Operation
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#080d1a',
                  border: '1px solid #1e293b',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: selectedApproval.status === 'APPROVED' ? '#10b981' : '#ef4444' }}>
                  {selectedApproval.status === 'APPROVED' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span style={{ fontWeight: 600 }}>Decision Recorded: {selectedApproval.status}</span>
                </div>
                <p style={{ color: '#94a3b8', marginTop: '6px' }}>
                  Authorized by <strong>{selectedApproval.approved_by}</strong> on {new Date(selectedApproval.approved_at || '').toLocaleString()}
                </p>
                {selectedApproval.rationale && (
                  <p style={{ color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                    "{selectedApproval.rationale}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
