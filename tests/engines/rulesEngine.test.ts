import { beforeEach, describe, expect, test, vi } from 'vitest';

const orMock = vi.fn();
const lteMock = vi.fn(() => ({ or: orMock }));
const selectMock = vi.fn(() => ({ lte: lteMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: fromMock },
}));

const RULES = [
  {
    id: 'rule-001',
    rule_type: 'tfsa_annual_limit',
    rule_content: { limit: 7000, currency: 'CAD', year: 2025 },
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
    last_reviewed_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rule-002',
    rule_type: 'resp_cesg',
    rule_content: { grant_rate: 0.2, annual_contribution_eligible: 2500 },
    effective_date: '2025-01-01',
    expiry_date: null,
    last_reviewed_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'rule-003',
    rule_type: 'quebec_parental_benefits',
    rule_content: { province: 'QC', program: 'QPIP' },
    effective_date: '2025-01-01',
    expiry_date: null,
    last_reviewed_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getRulesForContext', () => {
  test('returns active rules and includes null expiry', async () => {
    orMock.mockResolvedValue({ data: RULES, error: null });
    const { getRulesForContext } = await import('../../src/engines/rulesEngine');
    const result = await getRulesForContext('new_baby', 'QC');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => typeof r.rule_content === 'object')).toBe(true);
  });

  test('QC specific rules excluded for ON in new_baby context', async () => {
    orMock.mockResolvedValue({ data: RULES, error: null });
    const { getRulesForContext } = await import('../../src/engines/rulesEngine');
    const result = await getRulesForContext('new_baby', 'ON');
    expect(result.some((r) => r.rule_type === 'quebec_parental_benefits')).toBe(false);
  });

  test('QC specific rules included for QC in new_baby context', async () => {
    orMock.mockResolvedValue({ data: RULES, error: null });
    const { getRulesForContext } = await import('../../src/engines/rulesEngine');
    const result = await getRulesForContext('new_baby', 'QC');
    expect(result.some((r) => r.rule_type === 'quebec_parental_benefits')).toBe(true);
  });

  test('empty supabase data returns []', async () => {
    orMock.mockResolvedValue({ data: [], error: null });
    const { getRulesForContext } = await import('../../src/engines/rulesEngine');
    const result = await getRulesForContext('new_baby', 'ON');
    expect(result).toEqual([]);
  });
});

describe('Edge cases', () => {
  test('supabase error is propagated', async () => {
    orMock.mockResolvedValue({ data: null, error: new Error('db failed') });
    const { getRulesForContext } = await import('../../src/engines/rulesEngine');
    await expect(getRulesForContext('new_baby', 'ON')).rejects.toThrow('db failed');
  });
});
