import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const fromMock = vi.fn();
const classifyEventMock = vi.fn();
const generateBriefMock = vi.fn();
const fetchVerifiedDataMock = vi.fn();
const logAuditMock = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: fromMock },
}));
vi.mock('../../src/engines/classification', () => ({
  classifyEvent: classifyEventMock,
}));
vi.mock('../../src/engines/briefGenerator', () => ({
  generateBrief: generateBriefMock,
}));
vi.mock('../../src/engines/dataFetcher', () => ({
  fetchVerifiedData: fetchVerifiedDataMock,
}));
vi.mock('../../src/lib/audit', () => ({
  logAudit: logAuditMock,
}));

function makeApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use('/api/events', router);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  logAuditMock.mockResolvedValue(undefined);
  fetchVerifiedDataMock.mockResolvedValue({ client_id: 'client-uuid-001' });
  generateBriefMock.mockResolvedValue('brief-uuid-001');
});

describe('POST /api/events — self-reported event intake', () => {
  test('valid low-consequence event returns 201 and kicks async generation', async () => {
    classifyEventMock.mockReturnValue({
      risk_tier: 'low',
      routing_decision: 'auto_generate',
    });
    fromMock.mockImplementation((table: string) => {
      if (table === 'life_events') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'event-uuid-001' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app).post('/api/events').send({
      client_id: 'client-uuid-001',
      event_type: 'new_baby',
      source: 'self_reported',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        event_id: 'event-uuid-001',
        status: 'routed',
        confidence_score: 0.95,
      }),
    );
    expect(generateBriefMock).toHaveBeenCalled();
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event_created' }),
    );
  });

  test('high-consequence returns pending_classification and no generation', async () => {
    classifyEventMock.mockReturnValue({
      risk_tier: 'high',
      routing_decision: 'pending_classification',
    });
    fromMock.mockImplementation(() => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'event-uuid-002' }, error: null }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app).post('/api/events').send({
      client_id: 'client-uuid-001',
      event_type: 'lump_sum_deposit',
      source: 'self_reported',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_classification');
    expect(generateBriefMock).not.toHaveBeenCalled();
  });

  test('below-threshold result is held and no generation', async () => {
    classifyEventMock.mockReturnValue({
      risk_tier: 'low',
      routing_decision: 'held',
    });
    fromMock.mockImplementation(() => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'event-uuid-003' }, error: null }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app).post('/api/events').send({
      client_id: 'client-uuid-001',
      event_type: 'new_job',
      source: 'self_reported',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('held');
    expect(generateBriefMock).not.toHaveBeenCalled();
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event_held' }),
    );
  });

  test('invalid event_type returns 400', async () => {
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app).post('/api/events').send({
      client_id: 'client-uuid-001',
      event_type: 'invalid_event',
      source: 'self_reported',
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });

  test('missing client_id returns 400', async () => {
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app).post('/api/events').send({
      event_type: 'new_baby',
      source: 'self_reported',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/high-consequence', () => {
  test('returns events array, total, offset with default status', async () => {
    const eqStatusMock = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 'event-1',
            client_id: 'client-1',
            event_type: 'income_drop',
            source: 'account_signal',
            confidence_score: 0.71,
            signal_summary: 'Income dropped',
            created_at: '2026-01-01T00:00:00Z',
            clients: { name: 'Sarah' },
          },
        ],
        count: 1,
        error: null,
      }),
    );
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: eqStatusMock,
          order: () => ({ range: () => eqStatusMock() }),
        }),
      }),
    }));
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app).get('/api/events/high-consequence');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.events[0]).toEqual(
      expect.objectContaining({
        event_id: 'event-1',
        client_name: 'Sarah',
        source: 'account_signal',
      }),
    );
  });
});

describe('POST /api/events/:event_id/classify', () => {
  test('decision generate returns brief_id and triggers async generation', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'life_events') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'event-uuid-001',
                    client_id: 'client-uuid-001',
                    event_type: 'lump_sum_deposit',
                    confidence_score: 0.95,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === 'briefs') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'brief-uuid-001' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/events/event-uuid-001/classify')
      .send({ advisor_id: 'advisor-1', decision: 'generate' });
    expect(res.status).toBe(200);
    expect(res.body.brief_id).toBe('brief-uuid-001');
    expect(generateBriefMock).toHaveBeenCalled();
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event_classified' }),
    );
  });

  test('dismiss and escalate return null brief_id and proper audit action', async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'event-uuid-001',
                client_id: 'client-uuid-001',
                event_type: 'income_drop',
                confidence_score: 0.8,
              },
              error: null,
            }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }));
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const dismiss = await request(app)
      .post('/api/events/event-uuid-001/classify')
      .send({ advisor_id: 'advisor-1', decision: 'dismiss' });
    expect(dismiss.status).toBe(200);
    expect(dismiss.body.brief_id).toBeNull();
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event_dismissed' }),
    );

    const escalate = await request(app)
      .post('/api/events/event-uuid-001/classify')
      .send({ advisor_id: 'advisor-1', decision: 'escalate' });
    expect(escalate.status).toBe(200);
    expect(escalate.body.brief_id).toBeNull();
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event_escalated' }),
    );
  });

  test('invalid decision returns 400', async () => {
    const { default: router } = await import('../../src/routes/events');
    const app = makeApp(router);
    const res = await request(app)
      .post('/api/events/event-uuid-001/classify')
      .send({ advisor_id: 'advisor-1', decision: 'invalid' });
    expect(res.status).toBe(400);
  });
});
