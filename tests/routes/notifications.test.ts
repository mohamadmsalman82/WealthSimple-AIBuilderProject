import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const fromMock = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: fromMock },
}));

function makeApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/notifications', () => {
  test('missing client_id returns 400', async () => {
    const { default: router } = await import('../../src/routes/notifications');
    const app = makeApp(router);
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  test('returns notifications array sorted by delivered_at desc', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: [
                {
                  id: 'n2',
                  brief_id: 'b2',
                  client_id: 'client-1',
                  headline: 'New one',
                  delivered_at: '2026-01-02T10:00:00Z',
                  opened_at: null,
                  status: 'delivered',
                },
                {
                  id: 'n1',
                  brief_id: 'b1',
                  client_id: 'client-1',
                  headline: 'Old one',
                  delivered_at: '2026-01-01T10:00:00Z',
                  opened_at: '2026-01-01T11:00:00Z',
                  status: 'opened',
                },
              ],
              error: null,
            }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/notifications');
    const app = makeApp(router);
    const res = await request(app).get('/api/notifications?client_id=client-1');
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.notifications[0]).toEqual(
      expect.objectContaining({
        notification_id: 'n2',
        brief_id: 'b2',
        client_id: 'client-1',
        headline: 'New one',
        delivered_at: expect.any(String),
      }),
    );
    expect(res.body.notifications[0].opened_at).toBeNull();
    expect(['delivered', 'opened', 'dismissed']).toContain(
      res.body.notifications[0].status,
    );
  });

  test('empty result returns notifications: []', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/notifications');
    const app = makeApp(router);
    const res = await request(app).get('/api/notifications?client_id=client-1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ notifications: [] });
  });
});
