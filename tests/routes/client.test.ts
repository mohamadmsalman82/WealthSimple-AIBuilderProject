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

function makeApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use('/api/client', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/client/briefs/:brief_id', () => {
  test('returns client-facing brief and updates delivered->opened', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'briefs') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'brief-1',
                    client_id: 'client-1',
                    event_id: 'event-1',
                    created_at: '2026-01-01T00:00:00Z',
                    content: {
                      summary: 'Test summary',
                      actions: [
                        { rank: 1, title: 'A1', explanation: 'E1', cta_label: 'L1', cta_link: '/client/accounts/tfsa' },
                        { rank: 2, title: 'A2', explanation: 'E2', cta_label: 'L2', cta_link: '/client/accounts/rrsp' },
                        { rank: 3, title: 'A3', explanation: 'E3', cta_label: 'L3', cta_link: '/client/accounts/resp' },
                      ],
                    },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'life_events') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { event_type: 'new_baby', created_at: '2026-01-01T00:00:00Z' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'notifications') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: {
                          id: 'notif-1',
                          delivered_at: '2026-01-02T00:00:00Z',
                          status: 'delivered',
                          action_states: {},
                        },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'notif-1',
                      delivered_at: '2026-01-02T00:00:00Z',
                      status: 'opened',
                      action_states: {},
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const { default: router } = await import('../../src/routes/client');
    const app = makeApp(router);
    const res = await request(app).get('/api/client/briefs/brief-1?client_id=client-1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        brief_id: 'brief-1',
        event_type: 'new_baby',
        event_context: expect.any(String),
        content: expect.any(Object),
        delivered_at: expect.any(String),
      }),
    );
    expect(res.body.content.actions[0]).toHaveProperty('client_action');
    expect(res.body.content.actions[0].client_action).toBeNull();
  });

  test('missing client_id query returns 400', async () => {
    const { default: router } = await import('../../src/routes/client');
    const app = makeApp(router);
    const res = await request(app).get('/api/client/briefs/brief-1');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/client/briefs/:brief_id/actions', () => {
  test.each(['done', 'saved', 'dismissed'])('valid action %s returns 200', async (action) => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'briefs') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'brief-1', client_id: 'client-1' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'notifications') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: 'notif-1', action_states: { 1: 'saved' } },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      return {};
    });
    const { default: router } = await import('../../src/routes/client');
    const app = makeApp(router);
    const res = await request(app).post('/api/client/briefs/brief-1/actions').send({
      client_id: 'client-1',
      action_rank: 1,
      client_action: action,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        brief_id: 'brief-1',
        action_rank: 1,
        client_action: action,
        updated_at: expect.any(String),
      }),
    );
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  test('invalid action returns 400', async () => {
    const { default: router } = await import('../../src/routes/client');
    const app = makeApp(router);
    const res = await request(app).post('/api/client/briefs/brief-1/actions').send({
      client_id: 'client-1',
      action_rank: 1,
      client_action: 'invalid',
    });
    expect(res.status).toBe(400);
  });
});
