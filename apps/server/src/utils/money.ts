/**
 * Financial Arithmetic and Invariant Engine
 *
 * Rules:
 * 1. NEVER use IEEE 754 floating-point arithmetic for financial calculations.
 * 2. All additions, subtractions, and balance tracking must use integer minor units (cents).
 * 3. PayPal-compliant formatting: two decimal places (e.g., "15.00").
 * 4. Strictly reject negative amounts, non-numeric strings, and NaN.
 */

export class FinancialInvariantError extends Error {
  constructor(message: string) {
    super(`[FINANCIAL INVARIANT VIOLATION] ${message}`);
    this.name = 'FinancialInvariantError';
  }
}

/**
 * Converts a decimal string (e.g. "15.00", "24.5", "100") into integer cents.
 */
export function toCents(amountStr: string | number): number {
  if (typeof amountStr === 'number') {
    if (!Number.isFinite(amountStr) || isNaN(amountStr) || amountStr < 0) {
      throw new FinancialInvariantError(`Invalid numeric amount: ${amountStr}`);
    }
    amountStr = amountStr.toFixed(2);
  }

  if (typeof amountStr !== 'string') {
    throw new FinancialInvariantError(`Amount must be a string or number, received: ${typeof amountStr}`);
  }

  const trimmed = amountStr.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new FinancialInvariantError(`Malformed currency string: "${amountStr}". Must be positive decimal.`);
  }

  const [dollarsStr, centsStr = ''] = trimmed.split('.');
  const dollars = parseInt(dollarsStr, 10);
  const cents = parseInt((centsStr + '00').slice(0, 2), 10);

  const totalCents = dollars * 100 + cents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new FinancialInvariantError(`Amount must resolve to a safe positive integer cents value. Got: ${totalCents}`);
  }

  return totalCents;
}

/**
 * Converts integer cents back into a standard PayPal 2-decimal string.
 */
export function toDecimalString(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new FinancialInvariantError(`Cents must be a non-negative safe integer. Got: ${cents}`);
  }

  const dollars = Math.floor(cents / 100);
  const remainderCents = cents % 100;
  return `${dollars}.${remainderCents.toString().padStart(2, '0')}`;
}

/**
 * Validates that an array of milestone amounts sums exactly to the contract total.
 */
export function validateMilestonesSum(
  milestoneAmounts: string[],
  declaredTotalStr: string
): { valid: boolean; computedTotalCents: number; computedTotalStr: string } {
  let computedTotalCents = 0;

  for (const amt of milestoneAmounts) {
    const c = toCents(amt);
    computedTotalCents += c;
  }

  const declaredCents = toCents(declaredTotalStr);
  if (computedTotalCents !== declaredCents) {
    throw new FinancialInvariantError(
      `Sum of milestone amounts ($${toDecimalString(computedTotalCents)}) does not equal contract total ($${toDecimalString(declaredCents)})`
    );
  }

  return {
    valid: true,
    computedTotalCents,
    computedTotalStr: toDecimalString(computedTotalCents),
  };
}

/**
 * Validates that a requested capture does not exceed the remaining authorized hold.
 */
export function validateCaptureBounds(
  authorizedTotalStr: string,
  settledMilestoneAmounts: string[],
  requestedCaptureStr: string
): {
  authorizedCents: number;
  alreadySettledCents: number;
  requestedCents: number;
  remainingCents: number;
  remainingAfterCaptureCents: number;
} {
  const authorizedCents = toCents(authorizedTotalStr);
  let alreadySettledCents = 0;

  for (const amt of settledMilestoneAmounts) {
    alreadySettledCents += toCents(amt);
  }

  const requestedCents = toCents(requestedCaptureStr);
  const remainingCents = authorizedCents - alreadySettledCents;

  if (remainingCents < 0) {
    throw new FinancialInvariantError(
      `Corrupted state: settled amount ($${toDecimalString(alreadySettledCents)}) exceeds total authorized hold ($${toDecimalString(authorizedCents)})`
    );
  }

  if (requestedCents > remainingCents) {
    throw new FinancialInvariantError(
      `Capture amount ($${toDecimalString(requestedCents)}) exceeds remaining authorized hold ($${toDecimalString(remainingCents)})`
    );
  }

  return {
    authorizedCents,
    alreadySettledCents,
    requestedCents,
    remainingCents,
    remainingAfterCaptureCents: remainingCents - requestedCents,
  };
}
