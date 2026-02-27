import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  detectDebtPayoff,
  detectHomePurchase,
  detectInheritance,
  detectLumpSumDeposit,
  detectNewBaby,
  detectNewJob,
  runAllDetectors,
} from '../../src/engines/signalMonitor';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'txn-uuid',
    client_id: 'client-uuid-001',
    amount: 100.0,
    merchant_category: 'general',
    transaction_type: 'debit',
    description: 'Test transaction',
    date: '2026-01-15',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('detectNewBaby', () => {
  test('single baby_retail transaction returns null', () => {
    expect(detectNewBaby([makeTransaction({ merchant_category: 'baby_retail' })] as any)).toBeNull();
  });
  test('2 baby_retail within 21 days returns 0.800', () => {
    const result = detectNewBaby([
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-20' }),
    ] as any);
    expect(result).toEqual({ event_type: 'new_baby', confidence_score: 0.8 });
  });
  test('2 baby_retail + pharmacy returns 0.920', () => {
    const result = detectNewBaby([
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-20' }),
      makeTransaction({ merchant_category: 'pharmacy', date: '2026-01-05' }),
    ] as any);
    expect(result).toEqual({ event_type: 'new_baby', confidence_score: 0.92 });
  });
  test('2 baby_retail 22 days apart returns null', () => {
    const result = detectNewBaby([
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-23' }),
    ] as any);
    expect(result).toBeNull();
  });
  test('empty transaction array returns null', () => {
    expect(detectNewBaby([] as any)).toBeNull();
  });
});

describe('detectNewJob', () => {
  test('40% spike returns signal', () => {
    const txns = [
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-01-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-02-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-03-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1400, date: '2026-04-15' }),
    ];
    expect(detectNewJob(txns as any)).toEqual({ event_type: 'new_job', confidence_score: 0.88 });
  });
  test('39% spike returns null', () => {
    const txns = [
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-01-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-02-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-03-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1390, date: '2026-04-15' }),
    ];
    expect(detectNewJob(txns as any)).toBeNull();
  });
  test('fewer than 3 prior months returns null', () => {
    const txns = [
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-03-15' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1400, date: '2026-04-15' }),
    ];
    expect(detectNewJob(txns as any)).toBeNull();
  });
});

describe('detectLumpSumDeposit', () => {
  test('>= 25000 credit transfer_in returns signal', () => {
    const result = detectLumpSumDeposit([
      makeTransaction({ merchant_category: 'transfer_in', transaction_type: 'credit', amount: 25000 }),
    ] as any);
    expect(result).toEqual({ event_type: 'lump_sum_deposit', confidence_score: 0.95 });
  });
  test('24999.99 returns null', () => {
    expect(
      detectLumpSumDeposit([
        makeTransaction({ merchant_category: 'transfer_in', transaction_type: 'credit', amount: 24999.99 }),
      ] as any),
    ).toBeNull();
  });
  test('debit transfer_in returns null', () => {
    expect(
      detectLumpSumDeposit([
        makeTransaction({ merchant_category: 'transfer_in', transaction_type: 'debit', amount: 30000 }),
      ] as any),
    ).toBeNull();
  });
});

describe('detectDebtPayoff', () => {
  test('3 months then absent next month returns signal', () => {
    const result = detectDebtPayoff([
      makeTransaction({ merchant_category: 'loan_payment', transaction_type: 'debit', date: '2026-01-05' }),
      makeTransaction({ merchant_category: 'loan_payment', transaction_type: 'debit', date: '2026-02-05' }),
      makeTransaction({ merchant_category: 'loan_payment', transaction_type: 'debit', date: '2026-03-05' }),
    ] as any);
    expect(result).toEqual({ event_type: 'debt_payoff', confidence_score: 0.8 });
  });
  test('2 months only returns null', () => {
    expect(
      detectDebtPayoff([
        makeTransaction({ merchant_category: 'loan_payment', transaction_type: 'debit', date: '2026-01-05' }),
        makeTransaction({ merchant_category: 'loan_payment', transaction_type: 'debit', date: '2026-02-05' }),
      ] as any),
    ).toBeNull();
  });
});

describe('detectHomePurchase', () => {
  test('all 3 signals within 30 days returns 0.920', () => {
    const result = detectHomePurchase([
      makeTransaction({ merchant_category: 'legal_services', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'land_transfer', date: '2026-01-20' }),
      makeTransaction({ transaction_type: 'debit', amount: 50000, date: '2026-01-31' }),
    ] as any);
    expect(result).toEqual({ event_type: 'home_purchase', confidence_score: 0.92 });
  });
  test('31 day spread returns null', () => {
    const result = detectHomePurchase([
      makeTransaction({ merchant_category: 'legal_services', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'land_transfer', date: '2026-01-20' }),
      makeTransaction({ transaction_type: 'debit', amount: 50000, date: '2026-02-02' }),
    ] as any);
    expect(result).toBeNull();
  });
});

describe('detectInheritance', () => {
  test('credit with estate and >= 10000 returns signal', () => {
    const result = detectInheritance([
      makeTransaction({ transaction_type: 'credit', amount: 10000, description: 'Estate distribution' }),
    ] as any);
    expect(result).toEqual({ event_type: 'inheritance', confidence_score: 0.87 });
  });
  test('case-insensitive estate matching works', () => {
    expect(
      detectInheritance([
        makeTransaction({ transaction_type: 'credit', amount: 12000, description: 'ESTATE payout' }),
      ] as any),
    ).toEqual({ event_type: 'inheritance', confidence_score: 0.87 });
  });
  test('without estate text returns null', () => {
    expect(
      detectInheritance([
        makeTransaction({ transaction_type: 'credit', amount: 12000, description: 'bonus payout' }),
      ] as any),
    ).toBeNull();
  });
});

describe('Confidence score constraints across all detectors', () => {
  test('no detector returns confidence > 0.999 or exactly 1.0', () => {
    const detected = runAllDetectors([
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'baby_retail', date: '2026-01-20' }),
      makeTransaction({ merchant_category: 'pharmacy', date: '2026-01-10' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-02-01' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-03-01' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1000, date: '2026-04-01' }),
      makeTransaction({ merchant_category: 'payroll', transaction_type: 'credit', amount: 1500, date: '2026-05-01' }),
      makeTransaction({ merchant_category: 'transfer_in', transaction_type: 'credit', amount: 25000 }),
      makeTransaction({ merchant_category: 'legal_services', date: '2026-01-01' }),
      makeTransaction({ merchant_category: 'land_transfer', date: '2026-01-05' }),
      makeTransaction({ transaction_type: 'debit', amount: 60000, date: '2026-01-10' }),
      makeTransaction({ transaction_type: 'credit', amount: 15000, description: 'estate transfer' }),
    ] as any);
    for (const d of detected) {
      expect(d.confidence_score).toBeLessThanOrEqual(0.999);
      expect(d.confidence_score).not.toBe(1.0);
    }
  });
});
