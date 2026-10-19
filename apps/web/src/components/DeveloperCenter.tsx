import React, { useState } from 'react';
import {
  Code,
  Terminal,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/status', desc: 'Checks live PayPal Sandbox OAuth status, latency, and configured providers' },
  { method: 'GET', path: '/api/contracts', desc: 'Lists all agreements with milestone tranches and state' },
  { method: 'POST', path: '/api/payments/create-order', desc: 'Creates PayPal Orders v2 with intent "AUTHORIZE"' },
  { method: 'POST', path: '/api/contracts/:id/check-approval', desc: 'Verifies buyer approval status with PayPal' },
  { method: 'POST', path: '/api/contracts/:id/milestones/:mid/submit', desc: 'Submits deliverable payload to Gate 1 and Gate 2' },
  { method: 'POST', path: '/api/contracts/:id/void', desc: 'Voids remaining PayPal pre-authorization hold ($0 loss)' },
  { method: 'POST', path: '/api/contracts/:id/reconcile', desc: 'Queries PayPal Payments API directly to resolve desyncs' },
  { method: 'GET', path: '/api/receipts/:id', desc: 'Fetches cryptographic HMAC-SHA256 acceptance receipt & dispute packet' },
];

const MCP_TOOLS = [
  { name: 'create_escrow_contract', desc: 'Creates a hold agreement specifying payment ceiling and milestone criteria' },
  { name: 'submit_deliverable', desc: 'Autonomous agent submits task outputs for dual verification' },
  { name: 'check_verification_status', desc: 'Returns deterministic assertions and AI security findings' },
  { name: 'void_escrow', desc: 'Safely voids uncaptured hold funds back to the buyer' },
];

export function DeveloperCenter() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CURL_SUBMIT = `curl -X POST http://localhost:4000/api/contracts/ct_demo_101/milestones/m1/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "deliverable_payload": {
      "market_id": "us_retail_01",
      "timestamp": "${new Date().toISOString()}",
      "items": [
        {"sku": "SKU-01", "price": 29.99, "currency": "USD"},
        {"sku": "SKU-02", "price": 49.50, "currency": "USD"}
      ]
    }
  }'`;

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
          Integration & Reference
        </span>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.01em' }}>
          Developer Center & Architecture Guide
        </h2>
        <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
          Holdfast provides standard REST APIs and Model Context Protocol (MCP) tools for autonomous commerce agents in Claude Desktop, Cursor, and Antigravity.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left: REST API Reference */}
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
            <FileCode size={16} color="#0284c7" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              REST API Endpoints
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
            {API_ENDPOINTS.map((ep, i) => (
              <div
                key={i}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: ep.method === 'GET' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                      color: ep.method === 'GET' ? '#0284c7' : '#059669',
                      fontFamily: 'monospace',
                    }}
                  >
                    {ep.method}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#0f172a', fontWeight: 700 }}>
                    {ep.path}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{ep.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Model Context Protocol (MCP) Tools */}
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
            <Terminal size={16} color="#059669" />
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Model Context Protocol (MCP) Standard Tools
            </h3>
          </div>
          <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
            Exposed via stdio server (`packages/mcp-server`) for autonomous LLM tool-calling:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {MCP_TOOLS.map((tool, i) => (
              <div
                key={i}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '8px 12px',
                  borderRadius: '5px',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', fontSize: '11.5px' }}>
                  {tool.name}
                </span>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>cURL Deliverable Submission Example</span>
              <button
                onClick={() => handleCopy(CURL_SUBMIT, 'curl')}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
              >
                {copiedKey === 'curl' ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                {copiedKey === 'curl' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre
              style={{
                background: '#f8fafc',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontSize: '11px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                lineHeight: '1.4',
                margin: 0,
              }}
            >
              {CURL_SUBMIT}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
