import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Check,
} from 'lucide-react';

interface SettingsData {
  providers: {
    gemini: { configured: boolean; model: string };
    groq: { configured: boolean; model: string };
    openai: { configured: boolean; model: string };
  };
  paypal: {
    environment: string;
    client_id_configured: boolean;
    base_url: string;
  };
  security: {
    receipt_signing_algorithm: string;
    receipt_secret_configured: boolean;
  };
}

export function ProviderSettings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [activeAi, setActiveAi] = useState<string>('gemini');
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [probing, setProbing] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setActiveAi(data.active_ai_provider || 'gemini');
      })
      .catch((e) => console.warn('Failed to load settings:', e));
  }, []);

  const handleSaveActiveAi = async (provider: string) => {
    setActiveAi(provider);
    try {
      const res = await fetch('/api/settings/ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        setSavedFeedback(`Primary AI routing switched to ${provider.toUpperCase()}`);
        setTimeout(() => setSavedFeedback(null), 3000);
      }
    } catch (e: any) {
      console.warn('Failed to save provider:', e);
    }
  };

  if (!settings) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
        Loading provider configuration...
      </div>
    );
  }

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
        }}
      >
        <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Infrastructure Configuration
        </span>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.01em' }}>
          Provider & Sandbox Settings
        </h2>
        <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
          Multi-provider routing across Google Gemini, Groq, and OpenAI. API keys remain strictly on the backend server.
        </p>
      </div>

      {savedFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'rgba(5, 150, 105, 0.08)',
            border: '1px solid rgba(5, 150, 105, 0.25)',
            color: '#059669',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {savedFeedback}
        </div>
      )}

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* AI Provider Config */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#0284c7" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Multi-Provider AI Routing
            </h3>
          </div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
            Choose the default primary AI provider for risk assessment and Gate 2 adversarial evaluation:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {
                id: 'gemini',
                title: 'Google Gemini',
                model: settings.providers.gemini.model,
                configured: settings.providers.gemini.configured,
              },
              {
                id: 'groq',
                title: 'Groq LPU',
                model: settings.providers.groq.model,
                configured: settings.providers.groq.configured,
              },
              {
                id: 'openai',
                title: 'OpenAI',
                model: settings.providers.openai.model,
                configured: settings.providers.openai.configured,
              },
            ].map((p) => {
              const isSelected = activeAi === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSaveActiveAi(p.id)}
                  style={{
                    background: isSelected ? '#f0f9ff' : '#f8fafc',
                    border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    padding: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {p.title}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: '9.5px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                          ACTIVE PRIMARY
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      Model: {p.model}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      background: p.configured ? 'rgba(5, 150, 105, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                      color: p.configured ? '#059669' : '#64748b',
                    }}
                  >
                    {p.configured ? 'KEY CONFIGURED' : 'LOCAL FALLBACK ACTIVE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PayPal Sandbox & Security Secrets */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="#059669" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              PayPal Sandbox & Cryptographic Secrets
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Environment</span>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', margin: '2px 0 0' }}>
                {settings.paypal.environment}
              </p>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                Endpoint: {settings.paypal.base_url}
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>PayPal OAuth Credentials</span>
              <p style={{ fontSize: '12.5px', fontWeight: 600, color: settings.paypal.client_id_configured ? '#059669' : '#d97706', margin: '2px 0 0' }}>
                {settings.paypal.client_id_configured ? 'Sandbox Credentials Detected in .env' : 'Unconfigured (Explore Demo Mode)'}
              </p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
                Secrets remain isolated on the backend server. The web UI never accesses your Client Secret.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Acceptance Receipt Signing</span>
              <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#059669', margin: '2px 0 0' }}>
                {settings.security.receipt_signing_algorithm} Active
              </p>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Status: {settings.security.receipt_secret_configured ? 'Secret Configured in Environment' : 'Using Default Secret'}
              </span>
            </div>

            <button
              onClick={async () => {
                setProbing(true);
                try {
                  const res = await fetch('/api/paypal/test-connection', { method: 'POST' });
                  const data = await res.json();
                  if (data.connected) {
                    alert(`PayPal Sandbox Connected. Latency: ${data.latencyMs}ms`);
                  } else {
                    alert(`PayPal Sandbox Status: ${data.status}\n${data.error || ''}`);
                  }
                } catch (e: any) {
                  alert(`Connection check failed: ${e.message}`);
                } finally {
                  setProbing(false);
                }
              }}
              disabled={probing}
              className="action-btn primary"
              style={{ width: '100%', marginTop: '4px' }}
            >
              <RefreshCw size={13} className={probing ? 'spin' : ''} />
              {probing ? 'Probing Sandbox...' : 'Probe PayPal Sandbox Endpoint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
