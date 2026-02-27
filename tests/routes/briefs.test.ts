import { createHash } from 'crypto';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const fromMock = vi.fn();
const logAuditMock = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: fromMock },
}));
vi.mock('../../src/lib/audit', () => ({
  logAudit: logAuditMock,
}));

const MOCK_BRIEF = {
  id: 'brief-uuid-001',
  client_id: 'client-uuid-001',
  event_id: 'event-uuid-001',
  status: 'pending',
  content: {
    summary: 'Test summary',
    actions: [
      { rank: 1, title: 'Action 1', explanation: 'Explanation 1', cta_label: 'Open TFSA', cta_link: '/client/accounts/tfsa' },
      { rank: 2, title: 'Action 2', explanation: 'Explanation 2', cta_label: 'Open RRSP', cta_link: '/client/accounts/rrsp' },
      { rank: 3, title: 'Action 3', explanation: 'Explanation 3', cta_label: 'Open RESP', cta_link: '/client/accounts/resp' },
    ],
  },
  original_content_hash: 'abc123hash',
  final_content_hash: 'abc123hash',
  was_edited: false,
  advisor_id: null,
  rejection_reason: null,
  flag_reason: null,
  approved_at: null,
  rejected_at: null,
  flagged_at: null,
  created_at: '2026-01-15T10:00:00Z',
};

function makeApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use('/api/briefs', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  logAuditMock.mockResolvedValue(undefined);
});

describe('GET /api/briefs', () => {
  test('returns queue response shape', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            range: () =>
              Promise.resolve({
                data: [
                  {
                    id: MOCK_BRIEF.id,
                    client_id: MOCK_BRIEF.client_id,
                    status: 'pending',
                    created_at: MOCK_BRIEF.created_at,
                    clients: { name: 'Sarah Chen' },
                    life_events: {
                      event_type: 'new_baby',
                      source: 'self_reported',
                      confidence_score: 0.82,
                      risk_tier: 'low',
                    },
                  },
                ],
                count: 1,
                error: null,
              }),
          }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app).get('/api/briefs');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        briefs: expect.any(Array),
        total: 1,
        offset: 0,
      }),
    );
    expect(res.body.briefs[0]).toEqual(
      expect.objectContaining({
        brief_id: MOCK_BRIEF.id,
        client_name: 'Sarah Chen',
        event_type: 'new_baby',
        source: 'self_reported',
        risk_tier: 'low',
        time_in_queue_minutes: expect.any(Number),
      }),
    );
  });
});

describe('GET /api/briefs/:brief_id', () => {
  test('returns full brief with nested client object', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: MOCK_BRIEF.id,
                status: MOCK_BRIEF.status,
                created_at: MOCK_BRIEF.created_at,
                content: MOCK_BRIEF.content,
                clients: {
                  client_id: 'client-uuid-001',
                  name: 'Sarah Chen',
                  age: 34,
                  province: 'ON',
                  income_bracket: '75000-100000',
                  accounts: ['TFSA', 'RRSP'],
                  tfsa_room: 18500,
                  rrsp_room: 22400,
                  dependents: 1,
                },
                life_events: [
                  {
                    event_type: 'new_baby',
                    source: 'self_reported',
                    confidence_score: 0.82,
                    risk_tier: 'low',
                  },
                ],
              },
              error: null,
            }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app).get('/api/briefs/brief-uuid-001');
    expect(res.status).toBe(200);
    expect(res.body.client).toEqual(
      expect.objectContaining({ client_id: 'client-uuid-001', province: 'ON' }),
    );
    expect(res.body.content.actions).toHaveLength(3);
  });
});

describe('POST /api/briefs/:brief_id/approve', () => {
  test('approves brief, creates notification, writes audit', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'briefs') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: MOCK_BRIEF.id, client_id: MOCK_BRIEF.client_id, original_content_hash: MOCK_BRIEF.original_content_hash },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'notifications') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'notif-uuid-001' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/briefs/brief-uuid-001/approve')
      .send({
        advisor_id: 'advisor-uuid-001',
        edited_content: MOCK_BRIEF.content,
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.notification_queued).toBe(true);
    expect(typeof res.body.approved_at).toBe('string');
    expect(Number.isNaN(Date.parse(res.body.approved_at))).toBe(false);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'brief_approved' }),
    );
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'notification_sent' }),
    );
  });

  test('was_edited true when content hash changes', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'briefs') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: MOCK_BRIEF.id, client_id: MOCK_BRIEF.client_id, original_content_hash: 'different' },
                  error: null,
                }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: () => {
              const expected = createHash('sha256').update(JSON.stringify({ summary: 'changed', actions: [] })).digest('hex');
              expect(payload.was_edited).toBe(true);
              expect(payload.final_content_hash).toBe(expected);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === 'notifications') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'notif-uuid-001' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/briefs/brief-uuid-001/approve')
      .send({
        advisor_id: 'advisor-uuid-001',
        edited_content: { summary: 'changed', actions: [] },
      });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/briefs/:brief_id/reject', () => {
  test('rejects brief with valid reason', async () => {
    fromMock.mockImplementation(() => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: MOCK_BRIEF.id, client_id: MOCK_BRIEF.client_id },
                error: null,
              }),
          }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/briefs/brief-uuid-001/reject')
      .send({ advisor_id: 'advisor-1', rejection_reason: 'misclassified_event' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'brief_rejected' }),
    );
  });

  test('invalid rejection_reason returns 400', async () => {
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/briefs/brief-uuid-001/reject')
      .send({ advisor_id: 'advisor-1', rejection_reason: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/briefs/:brief_id/flag', () => {
  test('flags brief and writes audit', async () => {
    fromMock.mockImplementation(() => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: MOCK_BRIEF.id, client_id: MOCK_BRIEF.client_id },
                error: null,
              }),
          }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/briefs');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/briefs/brief-uuid-001/flag')
      .send({ advisor_id: 'advisor-1', flag_reason: 'compliance review' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('flagged');
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'brief_flagged' }),
    );
  });
});
