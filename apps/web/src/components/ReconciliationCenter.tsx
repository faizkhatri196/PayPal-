import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface ReconItem {
  contract_id: string;
  title: string;
  paypal_order_id: string;
  paypal_auth_id: string;
  authorized_hold_balance: string;
  local_settled_amount: string;
  reconciliation_state: string;
  currency: string;
}

export function ReconciliationCenter() {
  const [items, setItems] = useState<ReconItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const fetchReconciliation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts');
      if (res.ok) {
        const data = await res.json();
        const contracts = data.contracts || [];
        const mapped: ReconItem[] = contracts.map((c: any) => {
          const settled = (c.milestones || [])
            .filter((m: any) => m.status === 'ACCEPTED_SETTLED')
            .reduce((acc: number, m: any) => acc + parseFloat(m.amount || '0'), 0);
          return {
            contract_id: c.id,
            title: c.title,
            paypal_order_id: c.paypal_order_id || 'N/A',
            paypal_auth_id: c.paypal_auth_id || 'PENDING_APPROVAL',
            authorized_hold_balance: (parseFloat(c.total_amount) - settled).toFixed(2),
            local_settled_amount: settled.toFixed(2),
            reconciliation_state: c.status === 'DISPUTED' ? 'Desynced' : 'Reconciled',
            currency: c.currency || 'USD',
          };
        });
        setItems(mapped);
      }
    } catch (err) {
      console.warn('Failed to load reconciliation items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const handleSync = async (contractId: string) => {
    setSyncingId(contractId);
    setSyncFeedback(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/reconcile`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncFeedback(`Contract ${contractId} reconciled with PayPal. Authoritative hold balance verified.`);
        await fetchReconciliation();
      } else {
        setSyncFeedback(`Sync notice: ${data.error?.message || data.error}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync error: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Idempotent State Audit
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.01em' }}>
            Provider Reconciliation Center
          </h2>
          <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
            When upstream network drops occur during settlement, Holdfast prevents duplicate payments by querying authoritative PayPal Payments API v2 states directly.
          </p>
        </div>

        <button
          onClick={fetchReconciliation}
          disabled={loading}
          className="action-btn secondary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Audit All Contracts
        </button>
      </div>

      {syncFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: syncFeedback.startsWith('Sync error') ? 'rgba(220, 38, 38, 0.08)' : 'rgba(5, 150, 105, 0.08)',
            border: syncFeedback.startsWith('Sync error') ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(5, 150, 105, 0.25)',
            color: syncFeedback.startsWith('Sync error') ? '#dc2626' : '#059669',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {syncFeedback}
        </div>
      )}

      {/* Reconciliation Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '10px 16px', fontWeight: 700 }}>Contract Reference</th>
              <th style={{ padding: '10px 16px', fontWeight: 700 }}>PayPal Auth ID</th>
              <th style={{ padding: '10px 16px', fontWeight: 700 }}>Hold Balance</th>
              <th style={{ padding: '10px 16px', fontWeight: 700 }}>Local Settled</th>
              <th style={{ padding: '10px 16px', fontWeight: 700 }}>State Sync</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.contract_id}
                style={{ borderBottom: '1px solid #f1f5f9', color: '#0f172a' }}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>
                    {item.contract_id}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>
                  {item.paypal_auth_id || 'N/A'}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                  {item.currency} {item.authorized_hold_balance}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>
                  {item.currency} {item.local_settled_amount}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: item.reconciliation_state === 'Reconciled' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                      color: item.reconciliation_state === 'Reconciled' ? '#059669' : '#d97706',
                      border: `1px solid ${item.reconciliation_state === 'Reconciled' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                    }}
                  >
                    <CheckCircle2 size={12} />
                    {item.reconciliation_state}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleSync(item.contract_id)}
                    disabled={syncingId === item.contract_id}
                    className="action-btn secondary"
                    style={{ padding: '4px 10px', fontSize: '11.5px', color: '#0284c7', borderColor: '#0284c7' }}
                  >
                    <RefreshCw size={11} className={syncingId === item.contract_id ? 'spin' : ''} />
                    Sync with PayPal
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
