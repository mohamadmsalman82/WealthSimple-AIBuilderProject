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
  app.use('/api/audit', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/audit', () => {
  test('returns entries, total, offset and metadata object', async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: undefined as any,
    } as any;
    chain.then = (resolve: (v: unknown) => unknown) =>
      resolve({
        data: [
          {
            id: 'log-1',
            actor_id: 'advisor-1',
            actor_type: 'advisor',
            action: 'brief_approved',
            record_type: 'brief',
            record_id: 'brief-1',
            client_id: 'client-1',
            metadata: { event_type: 'new_baby' },
            timestamp: '2026-01-01T00:00:00Z',
          },
        ],
        count: 1,
        error: null,
      });
    fromMock.mockImplementation(() => ({
      select: () => ({
        order: () => ({
          range: () => chain,
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/audit');
    const app = makeApp(router);
    const res = await request(app).get(
      '/api/audit?client_id=client-1&advisor_id=advisor-1&event_type=new_baby&from=2026-01-01T00:00:00Z&to=2026-12-31T00:00:00Z&limit=10&offset=0',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        entries: expect.any(Array),
        total: 1,
        offset: 0,
      }),
    );
    expect(res.body.entries[0]).toEqual(
      expect.objectContaining({
        log_id: 'log-1',
        metadata: expect.any(Object),
        timestamp: expect.any(String),
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith('client_id', 'client-1');
    expect(chain.eq).toHaveBeenCalledWith('actor_id', 'advisor-1');
    expect(chain.eq).toHaveBeenCalledWith('metadata->>event_type', 'new_baby');
    expect(chain.gte).toHaveBeenCalledWith('timestamp', '2026-01-01T00:00:00Z');
    expect(chain.lte).toHaveBeenCalledWith('timestamp', '2026-12-31T00:00:00Z');
  });

  test('empty result returns entries: []', async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: undefined as any,
    } as any;
    chain.then = (resolve: (v: unknown) => unknown) =>
      resolve({
        data: [],
        count: 0,
        error: null,
      });
    fromMock.mockImplementation(() => ({
      select: () => ({
        order: () => ({
          range: () => chain,
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/audit');
    const app = makeApp(router);
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ entries: [], total: 0, offset: 0 });
  });
});
