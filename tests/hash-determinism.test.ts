import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

function computeDeliverableHash(payload: any): string {
  const canonical = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

describe('Deliverable Hash Determinism & Cryptographic Stability', () => {
  it('should generate identical SHA-256 for identical JSON payloads', () => {
    const payload1 = {
      market_id: 'US_EAST_ECOMMERCE',
      items: [
        { sku: 'ALPHA-PRO-1', price: 29.99, currency: 'USD' },
        { sku: 'BETA-MAX-2', price: 49.50, currency: 'USD' },
      ],
      timestamp: '2026-10-15T16:00:00.000Z',
    };

    const payload2 = {
      market_id: 'US_EAST_ECOMMERCE',
      items: [
        { sku: 'ALPHA-PRO-1', price: 29.99, currency: 'USD' },
        { sku: 'BETA-MAX-2', price: 49.50, currency: 'USD' },
      ],
      timestamp: '2026-10-15T16:00:00.000Z',
    };

    const hash1 = computeDeliverableHash(payload1);
    const hash2 = computeDeliverableHash(payload2);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should detect single-character modifications in deliverable data', () => {
    const original = {
      market_id: 'US_EAST_ECOMMERCE',
      items: [{ sku: 'ALPHA-PRO-1', price: 29.99 }],
    };

    const tampered = {
      market_id: 'US_EAST_ECOMMERCE',
      items: [{ sku: 'ALPHA-PRO-1', price: 29.98 }], // 1 cent difference
    };

    const hashOriginal = computeDeliverableHash(original);
    const hashTampered = computeDeliverableHash(tampered);

    expect(hashOriginal).not.toBe(hashTampered);
  });

  it('should produce valid hexadecimal string without unprintable characters', () => {
    const payload = {
      test: 'Holdfast Protocol Verification Evidence',
      status: 'VERIFIED',
    };

    const hash = computeDeliverableHash(payload);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
