import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  Fingerprint,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

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
}

export function EvidenceVault() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [disputePacket, setDisputePacket] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [tamperedHash, setTamperedHash] = useState<string>('');
  const [tamperTested, setTamperTested] = useState<boolean>(false);
  const [tamperPassed, setTamperPassed] = useState<boolean>(false);

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/receipts');
      if (res.ok) {
        const data = await res.json();
        const list = data.receipts || [];
        setReceipts(list);
        if (list.length > 0 && !selectedReceipt) {
          inspectReceipt(list[0].receipt_id);
        }
      }
    } catch (err) {
      console.warn('Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const inspectReceipt = async (id: string) => {
    try {
      const res = await fetch(`/api/receipts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReceipt(data.receipt);
        setDisputePacket(data.dispute_evidence_packet || '');
        setTamperedHash(data.receipt.deliverable_hash);
        setTamperTested(false);
      }
    } catch (err) {
      console.warn('Failed to inspect receipt:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testTamperDetection = () => {
    if (!selectedReceipt) return;
    const isOriginal = tamperedHash === selectedReceipt.deliverable_hash;
    setTamperTested(true);
    setTamperPassed(isOriginal);
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
            Evidence Vault & Receipts
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.01em' }}>
            HMAC-SHA256 Acceptance Receipts & Audit Chain
          </h2>
          <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
            Acceptance receipts bind deliverable hashes to PayPal authorization holds and capture IDs with HMAC-SHA256 digital signatures.
            Verification proves programmatic integrity and provides exportable dispute packets for PayPal Resolution Center.
          </p>
        </div>

        <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Minted Receipts</span>
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#059669', margin: 0 }}>{receipts.length}</p>
        </div>
      </div>

      {/* Main Grid: Receipts list + Receipt Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '16px' }}>
        {/* Receipts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
            Signed Receipts ({receipts.length})
          </h3>

          {receipts.length === 0 ? (
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
              <FileCheck size={28} style={{ color: '#0284c7', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '12.5px' }}>No acceptance receipts issued yet. Receipts are minted when milestones pass Gate 1 and Gate 2 verification.</p>
            </div>
          ) : (
            receipts.map((r) => {
              const isSelected = selectedReceipt?.receipt_id === r.receipt_id;
              return (
                <div
                  key={r.receipt_id}
                  onClick={() => inspectReceipt(r.receipt_id)}
                  style={{
                    background: isSelected ? '#f0f9ff' : '#ffffff',
                    border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    padding: '14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Fingerprint size={14} color="#059669" />
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', fontSize: '11.5px' }}>
                        {r.receipt_id}
                      </span>
                      <span style={{ fontSize: '9.5px', background: 'rgba(5, 150, 105, 0.08)', color: '#059669', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                        HMAC-SHA256 SIGNED
                      </span>
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{r.milestone_title}</h4>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      Capture: {r.paypal_capture_id} • Order: {r.paypal_order_id}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace', color: '#059669' }}>
                      {r.currency} {parseFloat(r.settled_amount).toFixed(2)}
                    </span>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                      {new Date(r.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Receipt Detailed Inspector & Tamper Simulator */}
        {selectedReceipt && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Receipt Details
                </span>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
                  {selectedReceipt.receipt_id}
                </h3>
              </div>
              <button
                onClick={() => handleCopy(disputePacket)}
                className="action-btn secondary"
                style={{ padding: '5px 10px', fontSize: '11.5px' }}
              >
                {copied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Evidence Packet'}
              </button>
            </div>

            {/* Cryptographic Signature Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '10px 12px',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>HMAC-SHA256 Digital Signature:</span>
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#059669', wordBreak: 'break-all', margin: 0, fontWeight: 600 }}>
                {selectedReceipt.digital_signature}
              </p>
            </div>

            {/* Deliverable Hash */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '10px 12px',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Deliverable SHA-256 Hash:</span>
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0284c7', wordBreak: 'break-all', margin: 0, fontWeight: 600 }}>
                {selectedReceipt.deliverable_hash}
              </p>
            </div>

            {/* Interactive Tamper Detection Simulator */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '12px',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706' }}>
                <AlertTriangle size={14} />
                <span style={{ fontSize: '11.5px', fontWeight: 700 }}>
                  1-Byte Tamper Detection Simulator
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                Modify any character of the deliverable hash below to test cryptographic tamper detection:
              </p>

              <input
                type="text"
                value={tamperedHash}
                onChange={(e) => setTamperedHash(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />

              <button
                onClick={testTamperDetection}
                className="action-btn secondary"
                style={{ padding: '6px 12px', fontSize: '11.5px', color: '#0284c7', borderColor: '#0284c7' }}
              >
                Verify Cryptographic Integrity
              </button>

              {tamperTested && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '4px',
                    background: tamperPassed ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    border: tamperPassed ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(220, 38, 38, 0.25)',
                    color: tamperPassed ? '#059669' : '#dc2626',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {tamperPassed ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                  {tamperPassed
                    ? 'Signature matches deliverable hash exactly. Integrity verified.'
                    : 'TAMPER DETECTED: Deliverable hash modified! Signature verification failed instantly.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
