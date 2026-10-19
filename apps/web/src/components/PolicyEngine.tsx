import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  FileCheck,
} from 'lucide-react';

interface PolicyRule {
  code: string;
  name: string;
  description: string;
  category: string;
  status: string;
  severity: string;
  enforcement: string;
  failures_caught: number;
}

export function PolicyEngine() {
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Policy Sandbox Interactive Evaluation State
  const [proposedAmount, setProposedAmount] = useState<string>('150.00');
  const [authorizedHold, setAuthorizedHold] = useState<string>('100.00');
  const [proposedCurrency, setProposedCurrency] = useState<string>('USD');
  const [holdCurrency, setHoldCurrency] = useState<string>('USD');
  const [aiSaysApprove, setAiSaysApprove] = useState<boolean>(true);
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
      }
    } catch (err) {
      console.warn('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const evaluateSandbox = async () => {
    try {
      const res = await fetch('/api/policies/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_amount: proposedAmount,
          authorized_hold: authorizedHold,
          proposed_currency: proposedCurrency,
          hold_currency: holdCurrency,
          ai_recommendation: aiSaysApprove ? 'PERMIT' : 'VETO',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvalResult(data);
      }
    } catch (err) {
      console.warn('Evaluation failed:', err);
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
            Deterministic Policy Engine
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.01em' }}>
            Policy Rules & Invariant Guard
          </h2>
          <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
            Deterministic programmatic invariants on money, state transitions, and amount ceilings. The security engine is strictly stronger than the AI layer: AI recommendations cannot override policy denials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Rules</span>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#059669', margin: 0 }}>{policies.length}</p>
          </div>
          <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Fail-Closed Guarantee</span>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', margin: 0 }}>100%</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Policy Catalog + Interactive Invariant Sandbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px' }}>
        {/* Left: Active Policies List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
            Enforcement Invariants ({policies.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {policies.map((pol) => (
              <div
                key={pol.code}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', fontSize: '11.5px' }}>
                      {pol.code}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: 'rgba(5, 150, 105, 0.08)',
                        color: '#059669',
                      }}
                    >
                      {pol.status}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {pol.category} • {pol.severity}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{pol.name}</h4>
                  <p style={{ fontSize: '11.5px', color: '#475569', margin: 0 }}>{pol.description}</p>
                </div>

                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <span style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Enforcement:</span>
                  <p style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600, margin: 0 }}>
                    {pol.enforcement}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Invariant Sandbox Demo */}
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
          <div>
            <span style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Invariant Collision Test
            </span>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              AI Override Prevention Sandbox
            </h3>
            <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Test what happens when an AI model recommends approval for $150.00 against a $100.00 ceiling.
            </p>
          </div>

          <div
            style={{
              background: '#f8fafc',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Proposed Capture Amount:
              </label>
              <input
                type="text"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Authorized PayPal Hold Ceiling:
              </label>
              <input
                type="text"
                value={authorizedHold}
                onChange={(e) => setAuthorizedHold(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Proposed Currency:
                </label>
                <input
                  type="text"
                  value={proposedCurrency}
                  onChange={(e) => setProposedCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    color: '#0f172a',
                    fontSize: '11.5px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Hold Currency:
                </label>
                <input
                  type="text"
                  value={holdCurrency}
                  onChange={(e) => setHoldCurrency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    color: '#0f172a',
                    fontSize: '11.5px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <input
                type="checkbox"
                id="aiRecommend"
                checked={aiSaysApprove}
                onChange={(e) => setAiSaysApprove(e.target.checked)}
              />
              <label htmlFor="aiRecommend" style={{ fontSize: '11.5px', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                Simulate AI Recommendation: <strong>PERMIT (AI says YES)</strong>
              </label>
            </div>
          </div>

          <button
            onClick={evaluateSandbox}
            className="action-btn primary"
            style={{ width: '100%', padding: '8px 14px' }}
          >
            <Play size={13} />
            Evaluate Against Policy Engine
          </button>

          {evalResult && (
            <div
              style={{
                background: evalResult.permitted ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: evalResult.permitted ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(220, 38, 38, 0.25)',
                padding: '12px',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {evalResult.permitted ? <CheckCircle2 size={15} color="#059669" /> : <ShieldAlert size={15} color="#dc2626" />}
                <strong style={{ fontSize: '12px', color: evalResult.permitted ? '#059669' : '#dc2626' }}>
                  {evalResult.verdict}: {evalResult.permitted ? 'ACTION PERMITTED' : 'EXECUTION BLOCKED'}
                </strong>
              </div>
              <p style={{ fontSize: '11.5px', color: '#334155', margin: 0, lineHeight: 1.4 }}>
                {aiSaysApprove && !evalResult.permitted
                  ? 'Key Invariant Upheld: Despite the AI model recommending approval, the deterministic policy engine detected a bound ceiling violation and blocked the capture ($0 moved).'
                  : 'All mathematical and currency invariants satisfied.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                {evalResult.rule_results?.map((r: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '11px', color: r.passed ? '#059669' : '#dc2626' }}>
                    • {r.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
