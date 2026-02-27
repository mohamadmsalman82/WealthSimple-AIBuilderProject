import { beforeEach, describe, expect, test, vi } from 'vitest';

const messagesCreateMock = vi.fn();
const logAuditMock = vi.fn();

const briefsInsertSingleMock = vi.fn();
const briefsUpdateEqMock = vi.fn();
const briefsDeleteEqMock = vi.fn();
const rulesSingleMock = vi.fn();

const briefsInsertMock = vi.fn(() => ({
  select: vi.fn(() => ({
    single: briefsInsertSingleMock,
  })),
}));

const briefsUpdateMock = vi.fn(() => ({
  eq: briefsUpdateEqMock,
}));

const briefsDeleteMock = vi.fn(() => ({
  eq: briefsDeleteEqMock,
}));

const rulesSelectMock = vi.fn(() => ({
  lte: vi.fn(() => ({
    or: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          single: rulesSingleMock,
        })),
      })),
    })),
  })),
}));

const supabaseFromMock = vi.fn((table: string) => {
  if (table === 'briefs') {
    return {
      insert: briefsInsertMock,
      update: briefsUpdateMock,
      delete: briefsDeleteMock,
    };
  }
  return {
    select: rulesSelectMock,
  };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: messagesCreateMock },
  })),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('../../src/lib/audit', () => ({
  logAudit: logAuditMock,
}));

const VALID_CLAUDE_RESPONSE = {
  summary:
    'With a new baby on the way, Sarah has an opportunity to maximize her $18,500 in available TFSA room and set up an RESP to access the Canada Education Savings Grant.',
  actions: [
    {
      rank: 1,
      title: 'Max out your TFSA',
      explanation: 'You have $18,500 in available TFSA room.',
      cta_label: 'Start contributing',
      cta_link: '/client/accounts/tfsa',
    },
    {
      rank: 2,
      title: 'Open an RESP',
      explanation: 'Government match available.',
      cta_label: 'Open RESP',
      cta_link: '/client/accounts/resp',
    },
    {
      rank: 3,
      title: 'Review RRSP room',
      explanation: 'You have $22,400 in RRSP room.',
      cta_label: 'Start contributing',
      cta_link: '/client/accounts/rrsp',
    },
  ],
};

function makeAnthropicResponse(payload: unknown) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = 'test-key';

  briefsInsertSingleMock.mockResolvedValue({
    data: { id: '11111111-1111-1111-1111-111111111111' },
    error: null,
  });
  briefsUpdateEqMock.mockResolvedValue({ error: null });
  briefsDeleteEqMock.mockResolvedValue({ error: null });
  rulesSingleMock.mockResolvedValue({ data: { id: 'rule-001' }, error: null });
  logAuditMock.mockResolvedValue(undefined);
  messagesCreateMock.mockResolvedValue(makeAnthropicResponse(VALID_CLAUDE_RESPONSE));
});

describe('Successful brief generation', () => {
  test('returns a brief_id and writes pending brief with hashes', async () => {
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    const briefId = await generateBrief({
      verifiedData: {
        client_id: 'client-uuid-001',
        name: 'Sarah',
        age: 34,
        province: 'ON',
        income_bracket: '75000-100000',
        accounts: ['TFSA'],
        tfsa_room: 18500,
        rrsp_room: 22400,
        dependents: 1,
        portfolio_total: 47250,
        rules: [],
      },
      eventType: 'new_baby',
      eventId: 'event-uuid-001',
      confidenceScore: 0.95,
    });

    expect(typeof briefId).toBe('string');
    expect(briefsInsertMock).toHaveBeenCalled();
    expect(briefsUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        content: VALID_CLAUDE_RESPONSE,
        was_edited: false,
        original_content_hash: expect.any(String),
        final_content_hash: expect.any(String),
      }),
    );
    const updateArg = briefsUpdateMock.mock.calls[0][0];
    expect(updateArg.original_content_hash).toBe(updateArg.final_content_hash);
    expect(logAuditMock).toHaveBeenCalledTimes(1);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'brief_generated',
        metadata: expect.objectContaining({
          event_type: 'new_baby',
          client_id: 'client-uuid-001',
          confidence_score: 0.95,
          rules_version: expect.any(String),
          model_used: 'claude-sonnet-4-6',
        }),
      }),
    );
  });
});

describe('Brief record status flow', () => {
  test('creates generating first then pending', async () => {
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await generateBrief({
      verifiedData: {
        client_id: 'client-uuid-001',
        name: 'Sarah',
        age: 34,
        province: 'ON',
        income_bracket: '75000-100000',
        accounts: ['TFSA'],
        tfsa_room: 18500,
        rrsp_room: 22400,
        dependents: 1,
        portfolio_total: 47250,
        rules: [],
      },
      eventType: 'new_baby',
      eventId: 'event-uuid-001',
      confidenceScore: 0.95,
    });
    expect(briefsInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'generating' }),
    );
    expect(briefsUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  test('if Claude fails, zombie generating record is cleaned up', async () => {
    messagesCreateMock.mockRejectedValueOnce(new Error('claude timeout'));
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await expect(
      generateBrief({
        verifiedData: {
          client_id: 'client-uuid-001',
          name: 'Sarah',
          age: 34,
          province: 'ON',
          income_bracket: '75000-100000',
          accounts: ['TFSA'],
          tfsa_room: 18500,
          rrsp_room: 22400,
          dependents: 1,
          portfolio_total: 47250,
          rules: [],
        },
        eventType: 'new_baby',
        eventId: 'event-uuid-001',
        confidenceScore: 0.95,
      }),
    ).rejects.toThrow();
    expect(briefsDeleteMock).toHaveBeenCalled();
  });
});

describe('Claude response validation', () => {
  test('malformed JSON throws', async () => {
    messagesCreateMock.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not-json' }] });
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await expect(
      generateBrief({
        verifiedData: {
          client_id: 'client-uuid-001',
          name: 'Sarah',
          age: 34,
          province: 'ON',
          income_bracket: '75000-100000',
          accounts: ['TFSA'],
          tfsa_room: 18500,
          rrsp_room: 22400,
          dependents: 1,
          portfolio_total: 47250,
          rules: [],
        },
        eventType: 'new_baby',
        eventId: 'event-uuid-001',
        confidenceScore: 0.95,
      }),
    ).rejects.toThrow('invalid JSON');
  });

  test('missing summary throws', async () => {
    messagesCreateMock.mockResolvedValueOnce(
      makeAnthropicResponse({ actions: VALID_CLAUDE_RESPONSE.actions }),
    );
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await expect(
      generateBrief({
        verifiedData: {
          client_id: 'client-uuid-001',
          name: 'Sarah',
          age: 34,
          province: 'ON',
          income_bracket: '75000-100000',
          accounts: ['TFSA'],
          tfsa_room: 18500,
          rrsp_room: 22400,
          dependents: 1,
          portfolio_total: 47250,
          rules: [],
        },
        eventType: 'new_baby',
        eventId: 'event-uuid-001',
        confidenceScore: 0.95,
      }),
    ).rejects.toThrow('expected brief shape');
  });

  test('invalid cta_link causes throw after retry', async () => {
    messagesCreateMock.mockResolvedValue(
      makeAnthropicResponse({
        ...VALID_CLAUDE_RESPONSE,
        actions: [
          { ...VALID_CLAUDE_RESPONSE.actions[0], cta_link: '/invalid' },
          VALID_CLAUDE_RESPONSE.actions[1],
          VALID_CLAUDE_RESPONSE.actions[2],
        ],
      }),
    );
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await expect(
      generateBrief({
        verifiedData: {
          client_id: 'client-uuid-001',
          name: 'Sarah',
          age: 34,
          province: 'ON',
          income_bracket: '75000-100000',
          accounts: ['TFSA'],
          tfsa_room: 18500,
          rrsp_room: 22400,
          dependents: 1,
          portfolio_total: 47250,
          rules: [],
        },
        eventType: 'new_baby',
        eventId: 'event-uuid-001',
        confidenceScore: 0.95,
      }),
    ).rejects.toThrow('hallucinated CTA links');
    expect(messagesCreateMock).toHaveBeenCalledTimes(2);
  });
});

describe('Audit log resilience', () => {
  test('audit failure does not fail brief generation', async () => {
    logAuditMock.mockRejectedValueOnce(new Error('audit fail'));
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await expect(
      generateBrief({
        verifiedData: {
          client_id: 'client-uuid-001',
          name: 'Sarah',
          age: 34,
          province: 'ON',
          income_bracket: '75000-100000',
          accounts: ['TFSA'],
          tfsa_room: 18500,
          rrsp_room: 22400,
          dependents: 1,
          portfolio_total: 47250,
          rules: [],
        },
        eventType: 'new_baby',
        eventId: 'event-uuid-001',
        confidenceScore: 0.95,
      }),
    ).resolves.toBe('11111111-1111-1111-1111-111111111111');
  });
});

describe('Error handling', () => {
  test('supabase insert failure throws', async () => {
    briefsInsertSingleMock.mockResolvedValueOnce({
      data: null,
      error: new Error('insert failed'),
    });
    const { generateBrief } = await import('../../src/engines/briefGenerator');
    await expect(
      generateBrief({
        verifiedData: {
          client_id: 'client-uuid-001',
          name: 'Sarah',
          age: 34,
          province: 'ON',
          income_bracket: '75000-100000',
          accounts: ['TFSA'],
          tfsa_room: 18500,
          rrsp_room: 22400,
          dependents: 1,
          portfolio_total: 47250,
          rules: [],
        },
        eventType: 'new_baby',
        eventId: 'event-uuid-001',
        confidenceScore: 0.95,
      }),
    ).rejects.toThrow('insert failed');
  });
});
