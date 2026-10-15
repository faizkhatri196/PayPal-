import { describe, it, expect } from 'vitest';
import {
  toCents,
  toDecimalString,
  validateMilestonesSum,
  validateCaptureBounds,
  FinancialInvariantError,
} from '../apps/server/src/utils/money.js';

describe('Financial Arithmetic & Invariant Engine', () => {
  describe('toCents conversion', () => {
    it('converts standard 2-decimal strings to exact integer cents', () => {
      expect(toCents('15.00')).toBe(1500);
      expect(toCents('0.99')).toBe(99);
      expect(toCents('100.50')).toBe(10050);
      expect(toCents('24.5')).toBe(2450);
    });

    it('rejects negative, malformed, or zero amounts', () => {
      expect(() => toCents('-15.00')).toThrow(FinancialInvariantError);
      expect(() => toCents('0.00')).toThrow(FinancialInvariantError);
      expect(() => toCents('abc')).toThrow(FinancialInvariantError);
      expect(() => toCents('15.999')).toThrow(FinancialInvariantError); // more than 2 decimals
    });
  });

  describe('toDecimalString conversion', () => {
    it('converts cents back to clean PayPal 2-decimal format', () => {
      expect(toDecimalString(1500)).toBe('15.00');
      expect(toDecimalString(99)).toBe('0.99');
      expect(toDecimalString(2450)).toBe('24.50');
      expect(toDecimalString(0)).toBe('0.00');
    });

    it('rejects negative or unsafe integer cents', () => {
      expect(() => toDecimalString(-10)).toThrow(FinancialInvariantError);
      expect(() => toDecimalString(NaN)).toThrow(FinancialInvariantError);
    });
  });

  describe('validateMilestonesSum', () => {
    it('passes when milestone amounts equal contract total', () => {
      const result = validateMilestonesSum(['15.00', '20.00'], '35.00');
      expect(result.valid).toBe(true);
      expect(result.computedTotalCents).toBe(3500);
      expect(result.computedTotalStr).toBe('35.00');
    });

    it('throws FinancialInvariantError when milestone amounts diverge from total', () => {
      expect(() => validateMilestonesSum(['15.00', '25.00'], '35.00')).toThrow(
        FinancialInvariantError
      );
    });
  });

  describe('validateCaptureBounds', () => {
    it('calculates remaining authorized hold accurately', () => {
      const bounds = validateCaptureBounds('35.00', ['15.00'], '10.00');
      expect(bounds.authorizedCents).toBe(3500);
      expect(bounds.alreadySettledCents).toBe(1500);
      expect(bounds.remainingCents).toBe(2000);
      expect(bounds.remainingAfterCaptureCents).toBe(1000);
    });

    it('throws FinancialInvariantError when capture exceeds remaining authorized hold', () => {
      // Authorized: $35.00. Settled: $15.00. Remaining: $20.00.
      // Attempting to capture $25.00 should throw!
      expect(() => validateCaptureBounds('35.00', ['15.00'], '25.00')).toThrow(
        FinancialInvariantError
      );
    });
  });
});
