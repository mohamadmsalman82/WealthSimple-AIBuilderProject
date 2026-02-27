import { beforeEach, describe, expect, test, vi } from 'vitest';

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const getRulesForContextMock = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('../../src/engines/rulesEngine', () => ({
  getRulesForContext: getRulesForContextMock,
}));

const CLIENT = {
  id: 'client-uuid-001',
  name: 'Sarah Chen',
  email: 'sarah.chen@example.com',
  age: 34,
  province: 'ON',
  income_bracket: '75000-100000',
  accounts: ['TFSA', 'RRSP'],
  tfsa_room: 18500,
  rrsp_room: 22400,
  dependents: 1,
  avatar_initials: 'SC',
  portfolio_total: 47250.0,
  created_at: '2024-03-15T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Successful data fetch', () => {
  test('returns verified data with required fields and rule attachment', async () => {
    singleMock.mockResolvedValue({ data: CLIENT, error: null });
    getRulesForContextMock.mockResolvedValue([
      {
        id: 'r1',
        rule_type: 'tfsa_annual_limit',
        rule_content: { limit: 7000 },
        effective_date: '2025-01-01',
        expiry_date: null,
      },
    ]);

    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    const result = await fetchVerifiedData('client-uuid-001', 'new_baby');

    expect(result).toMatchObject({
      client_id: CLIENT.id,
      name: CLIENT.name,
      age: CLIENT.age,
      province: CLIENT.province,
      income_bracket: CLIENT.income_bracket,
      accounts: CLIENT.accounts,
      tfsa_room: CLIENT.tfsa_room,
      rrsp_room: CLIENT.rrsp_room,
      dependents: CLIENT.dependents,
    });
    expect(result.portfolio_total).toBeTypeOf('number');
    expect(result.rules).toHaveLength(1);
    expect(getRulesForContextMock).toHaveBeenCalledWith('new_baby', 'ON');
  });
});

describe('Rules attachment', () => {
  test('empty rules response returns []', async () => {
    singleMock.mockResolvedValue({ data: CLIENT, error: null });
    getRulesForContextMock.mockResolvedValue([]);

    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    const result = await fetchVerifiedData('client-uuid-001', 'new_job');
    expect(result.rules).toEqual([]);
  });

  test('all returned rules are passed through', async () => {
    const rules = [
      { id: 'r1', rule_type: 'a', rule_content: {}, effective_date: '2025-01-01', expiry_date: null },
      { id: 'r2', rule_type: 'b', rule_content: {}, effective_date: '2025-01-01', expiry_date: null },
      { id: 'r3', rule_type: 'c', rule_content: {}, effective_date: '2025-01-01', expiry_date: null },
    ];
    singleMock.mockResolvedValue({ data: CLIENT, error: null });
    getRulesForContextMock.mockResolvedValue(rules);

    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    const result = await fetchVerifiedData('client-uuid-001', 'marriage');

    expect(result.rules).toHaveLength(3);
    expect(result.rules).toEqual(
      rules.map((r) => ({
        rule_type: r.rule_type,
        rule_content: r.rule_content,
        effective_date: r.effective_date,
        expiry_date: r.expiry_date,
      })),
    );
  });
});

describe('Error handling', () => {
  test('missing client throws clear error', async () => {
    singleMock.mockResolvedValue({ data: null, error: null });
    getRulesForContextMock.mockResolvedValue([]);
    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    await expect(fetchVerifiedData('does-not-exist', 'new_baby')).rejects.toThrow(
      'Client not found: does-not-exist',
    );
  });

  test('supabase query failure throws', async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: new Error('network down'),
    });
    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    await expect(fetchVerifiedData('client-uuid-001', 'new_baby')).rejects.toThrow(
      'network down',
    );
  });

  test('rules engine failure is propagated', async () => {
    singleMock.mockResolvedValue({ data: CLIENT, error: null });
    getRulesForContextMock.mockRejectedValue(new Error('rules exploded'));
    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    await expect(fetchVerifiedData('client-uuid-001', 'new_baby')).rejects.toThrow(
      'rules exploded',
    );
  });
});

describe('Data integrity', () => {
  test('room fields are integers and accounts is array', async () => {
    singleMock.mockResolvedValue({ data: CLIENT, error: null });
    getRulesForContextMock.mockResolvedValue([]);
    const { fetchVerifiedData } = await import('../../src/engines/dataFetcher');
    const result = await fetchVerifiedData('client-uuid-001', 'new_baby');

    expect(Number.isInteger(result.tfsa_room)).toBe(true);
    expect(Number.isInteger(result.rrsp_room)).toBe(true);
    expect(Array.isArray(result.accounts)).toBe(true);
    expect(result.income_bracket).toBe('75000-100000');
  });
});
