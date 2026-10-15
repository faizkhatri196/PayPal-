import crypto from 'node:crypto';
import { MilestoneCriteria } from '../db/store.js';

export interface DeterministicResult {
  passed: boolean;
  deliverable_hash: string;
  checks_run: Array<{ name: string; passed: boolean; message: string }>;
  failure_reason?: string;
}

export function computeDeliverableHash(payload: any): string {
  const canonicalString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload, Object.keys(payload || {}).sort());
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function runDeterministicVerification(
  payload: any,
  criteria: MilestoneCriteria
): DeterministicResult {
  const deliverableHash = computeDeliverableHash(payload);
  const checksRun: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check 1: Non-null and non-empty deliverable
  if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
    return {
      passed: false,
      deliverable_hash: deliverableHash,
      checks_run: [{ name: 'NON_EMPTY_PAYLOAD', passed: false, message: 'Payload is empty or null' }],
      failure_reason: 'Deliverable payload cannot be empty',
    };
  }
  checksRun.push({ name: 'NON_EMPTY_PAYLOAD', passed: true, message: 'Payload received and non-empty' });

  // Check 2: Required schema keys
  if (criteria.required_keys && criteria.required_keys.length > 0) {
    const missingKeys = criteria.required_keys.filter((k) => !(k in payload));
    if (missingKeys.length > 0) {
      checksRun.push({
        name: 'SCHEMA_REQUIRED_KEYS',
        passed: false,
        message: `Missing required keys: ${missingKeys.join(', ')}`,
      });
      return {
        passed: false,
        deliverable_hash: deliverableHash,
        checks_run: checksRun,
        failure_reason: `Schema validation failed: missing keys [${missingKeys.join(', ')}]`,
      };
    }
    checksRun.push({
      name: 'SCHEMA_REQUIRED_KEYS',
      passed: true,
      message: `All required keys present: [${criteria.required_keys.join(', ')}]`,
    });
  }

  // Check 3: Schema type specific assertions
  if (criteria.schema_type === 'pricing_report') {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      checksRun.push({
        name: 'PRICING_ITEMS_ARRAY',
        passed: false,
        message: 'items field must be a non-empty array of competitor prices',
      });
      return {
        passed: false,
        deliverable_hash: deliverableHash,
        checks_run: checksRun,
        failure_reason: 'Pricing report must contain at least one item',
      };
    }

    if (criteria.min_items && payload.items.length < criteria.min_items) {
      checksRun.push({
        name: 'PRICING_MIN_ITEMS_THRESHOLD',
        passed: false,
        message: `Found ${payload.items.length} items, but minimum required is ${criteria.min_items}`,
      });
      return {
        passed: false,
        deliverable_hash: deliverableHash,
        checks_run: checksRun,
        failure_reason: `Threshold not met: required ${criteria.min_items} items, received ${payload.items.length}`,
      };
    }

    // Numerical sanity check
    const invalidPrices = payload.items.filter(
      (it: any) => typeof it.price !== 'number' || it.price <= 0 || isNaN(it.price)
    );
    if (invalidPrices.length > 0) {
      checksRun.push({
        name: 'NUMERICAL_PRICE_SANITY',
        passed: false,
        message: `Found ${invalidPrices.length} items with non-positive or non-numeric prices`,
      });
      return {
        passed: false,
        deliverable_hash: deliverableHash,
        checks_run: checksRun,
        failure_reason: 'Every pricing entry must have a strictly positive numeric price',
      };
    }

    checksRun.push({
      name: 'PRICING_ITEMS_VALID',
      passed: true,
      message: `Verified ${payload.items.length} pricing records with valid numbers`,
    });
  }

  return {
    passed: true,
    deliverable_hash: deliverableHash,
    checks_run: checksRun,
  };
}
