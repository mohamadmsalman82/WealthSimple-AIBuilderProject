import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

type Row = Record<string, any>;

const store = {
  life_events: [] as Row[],
  briefs: [] as Row[],
  notifications: [] as Row[],
};

const auditCalls: Row[] = [];

const classifyEventMock = vi.fn();
const fetchVerifiedDataMock = vi.fn();
const generateBriefMock = vi.fn();
const logAuditMock = vi.fn(async (payload: Row) => {
  auditCalls.push(payload);
});

function makeThenable(value: Row) {
  return {
    ...value,
    then: (resolve: (v: Row) => void) => resolve(value),
  };
}

function byId(list: Row[], id: string) {
  return list.find((r) => r.id === id) ?? null;
}

const supabaseFromMock = vi.fn((table: string) => {
  if (table === 'life_events') {
    return {
      insert: (payload: Row) => ({
        select: () => ({
          single: async () => {
            const row = {
              id: `event-${store.life_events.length + 1}`,
              created_at: new Date().toISOString(),
              ...payload,
            };
            store.life_events.push(row);
            return { data: { id: row.id }, error: null };
          },
        }),
      }),
      select: () => ({
        eq: (field: string, val: string) => ({
          eq: (field2: string, val2: string) => ({
            order: () => ({
              range: async () => {
                const events = store.life_events
                  .filter((r) => r[field] === val && r[field2] === val2)
                  .map((r) => ({ ...r, clients: { name: 'Client Name' } }));
                return { data: events, count: events.length, error: null };
              },
            }),
          }),
          single: async () => {
            const event = store.life_events.find((r) => r[field] === val) ?? null;
            return { data: event, error: null };
          },
        }),
      }),
      update: (changes: Row) => ({
        eq: (field: string, val: string) => {
          const event = store.life_events.find((r) => r[field] === val);
          if (event) Object.assign(event, changes);
          return makeThenable({ error: null });
        },
      }),
    };
  }

  if (table === 'briefs') {
    return {
      insert: (payload: Row) => ({
        select: () => ({
          single: async () => {
            const row = {
              id: `brief-${store.briefs.length + 1}`,
              created_at: new Date().toISOString(),
              ...payload,
            };
            store.briefs.push(row);
            return { data: { id: row.id }, error: null };
          },
        }),
      }),
      select: () => ({
        eq: (field: string, val: string) => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            range: async () => {
              const rows = store.briefs
                .filter((r) => r[field] === val)
                .map((b) => ({
                  ...b,
                  clients: { name: 'Sarah Chen' },
                  life_events: {
                    event_type: byId(store.life_events, b.event_id)?.event_type ?? '',
                    source: byId(store.life_events, b.event_id)?.source ?? '',
                    confidence_score: byId(store.life_events, b.event_id)?.confidence_score ?? 0,
                    risk_tier: byId(store.life_events, b.event_id)?.risk_tier ?? '',
                  },
                }));
              return { data: rows, count: rows.length, error: null };
            },
          }),
          single: async () => {
            const brief = store.briefs.find((r) => r[field] === val) ?? null;
            if (!brief) return { data: null, error: null };
            return {
              data: {
                ...brief,
                clients: {
                  client_id: brief.client_id,
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
                    event_type: byId(store.life_events, brief.event_id)?.event_type ?? '',
                    source: byId(store.life_events, brief.event_id)?.source ?? '',
                    confidence_score: byId(store.life_events, brief.event_id)?.confidence_score ?? 0,
                    risk_tier: byId(store.life_events, brief.event_id)?.risk_tier ?? '',
                  },
                ],
              },
              error: null,
            };
          },
        }),
      }),
      update: (changes: Row) => ({
        eq: (field: string, val: string) => {
          const brief = store.briefs.find((r) => r[field] === val);
          if (brief) Object.assign(brief, changes);
          return makeThenable({
            data: brief ? { id: brief.id, client_id: brief.client_id } : null,
            error: null,
            select: () => ({
              single: async () => ({
                data: brief ? { id: brief.id, client_id: brief.client_id } : null,
                error: null,
              }),
            }),
          });
        },
      }),
    };
  }

  if (table === 'notifications') {
    return {
      insert: (payload: Row) => ({
        select: () => ({
          single: async () => {
            const row = { id: `notif-${store.notifications.length + 1}`, ...payload };
            store.notifications.push(row);
            return { data: { id: row.id }, error: null };
          },
        }),
      }),
      select: () => ({
        eq: (field: string, val: string) => ({
          eq: (field2: string, val2: string) => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => {
                  const row =
                    store.notifications
                      .filter((n) => n[field] === val && n[field2] === val2)
                      .at(-1) ?? null;
                  return { data: row, error: null };
                },
              }),
            }),
          }),
          order: () =>
            Promise.resolve({
              data: store.notifications.filter((n) => n[field] === val),
              error: null,
            }),
        }),
      }),
      update: (changes: Row) => ({
        eq: (field: string, val: string) => {
          const notif = store.notifications.find((n) => n[field] === val);
          if (notif) Object.assign(notif, changes);
          return makeThenable({
            error: null,
            data: notif,
            select: () => ({
              single: async () => ({ data: notif, error: null }),
            }),
          });
        },
      }),
    };
  }

  return {};
});

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: supabaseFromMock },
}));
vi.mock('../../src/lib/audit', () => ({
  logAudit: logAuditMock,
}));
vi.mock('../../src/engines/classification', () => ({
  classifyEvent: classifyEventMock,
}));
vi.mock('../../src/engines/dataFetcher', () => ({
  fetchVerifiedData: fetchVerifiedDataMock,
}));
vi.mock('../../src/engines/briefGenerator', () => ({
  generateBrief: generateBriefMock,
}));

function makeApp(routers: {
  events: express.Router;
  briefs: express.Router;
  notifications: express.Router;
  client: express.Router;
}) {
  const app = express();
  app.use(express.json());
  app.use('/api/events', routers.events);
  app.use('/api/briefs', routers.briefs);
  app.use('/api/notifications', routers.notifications);
  app.use('/api/client', routers.client);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  store.life_events = [];
  store.briefs = [];
  store.notifications = [];
  auditCalls.length = 0;

  classifyEventMock.mockImplementation((input: Row) => {
    if (input.confidence_score < 0.65) return { risk_tier: 'low', routing_decision: 'held' };
    if (['lump_sum_deposit', 'spouse_death', 'divorce', 'income_drop'].includes(input.event_type)) {
      return { risk_tier: 'high', routing_decision: 'pending_classification' };
    }
    return { risk_tier: 'low', routing_decision: 'auto_generate' };
  });

  fetchVerifiedDataMock.mockResolvedValue({ client_id: 'client-uuid-001' });
  generateBriefMock.mockImplementation(async (input: Row) => {
    await new Promise((r) => setTimeout(r, 0));
    if (input.existingBriefId) {
      const existing = byId(store.briefs, input.existingBriefId);
      if (existing) {
        existing.status = 'pending';
        existing.content = {
          summary: 'Generated summary',
          actions: [
            { rank: 1, title: 'A1', explanation: 'E1', cta_label: 'L1', cta_link: '/client/accounts/tfsa' },
            { rank: 2, title: 'A2', explanation: 'E2', cta_label: 'L2', cta_link: '/client/accounts/rrsp' },
            { rank: 3, title: 'A3', explanation: 'E3', cta_label: 'L3', cta_link: '/client/accounts/resp' },
          ],
        };
      }
      return input.existingBriefId;
    }
    const row = {
      id: `brief-${store.briefs.length + 1}`,
      client_id: input.verifiedData.client_id,
      event_id: input.eventId,
      status: 'pending',
      original_content_hash: 'hash',
      final_content_hash: 'hash',
      content: {
        summary: 'Generated summary',
        actions: [
          { rank: 1, title: 'A1', explanation: 'E1', cta_label: 'L1', cta_link: '/client/accounts/tfsa' },
          { rank: 2, title: 'A2', explanation: 'E2', cta_label: 'L2', cta_link: '/client/accounts/rrsp' },
          { rank: 3, title: 'A3', explanation: 'E3', cta_label: 'L3', cta_link: '/client/accounts/resp' },
        ],
      },
      created_at: new Date().toISOString(),
    };
    store.briefs.push(row);
    await logAuditMock({
      actor_type: 'system',
      action: 'brief_generated',
      record_type: 'brief',
      record_id: row.id,
      client_id: row.client_id,
      metadata: { event_type: 'new_baby' },
    });
    return row.id;
  });
});

describe('Full flow — self-reported low-consequence event', () => {
  test('new_baby intake flows to pending brief', async () => {
    const [events, briefs, notifications, client] = await Promise.all([
      import('../../src/routes/events'),
      import('../../src/routes/briefs'),
      import('../../src/routes/notifications'),
      import('../../src/routes/client'),
    ]);
    const app = makeApp({
      events: events.default,
      briefs: briefs.default,
      notifications: notifications.default,
      client: client.default,
    });
    const res = await request(app).post('/api/events').send({
      client_id: 'client-uuid-001',
      event_type: 'new_baby',
      source: 'self_reported',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('routed');
    expect(res.body.confidence_score).toBe(0.95);
    await new Promise((r) => setTimeout(r, 1));
    expect(store.life_events).toHaveLength(1);
    expect(store.briefs.some((b) => b.status === 'pending')).toBe(true);
    expect(auditCalls.map((a) => a.action)).toContain('event_created');
    expect(auditCalls.map((a) => a.action)).toContain('event_routed');
  });
});

describe('Full flow — advisor approval to client notification', () => {
  test('approve brief creates delivered notification then opens on client read', async () => {
    store.briefs.push({
      id: 'brief-1',
      client_id: 'client-uuid-001',
      event_id: 'event-1',
      status: 'pending',
      content: {
        summary: 'pending',
        actions: [
          { rank: 1, title: 'A1', explanation: 'E1', cta_label: 'L1', cta_link: '/client/accounts/tfsa' },
          { rank: 2, title: 'A2', explanation: 'E2', cta_label: 'L2', cta_link: '/client/accounts/rrsp' },
          { rank: 3, title: 'A3', explanation: 'E3', cta_label: 'L3', cta_link: '/client/accounts/resp' },
        ],
      },
      original_content_hash: 'h1',
      created_at: new Date().toISOString(),
    });
    store.life_events.push({
      id: 'event-1',
      client_id: 'client-uuid-001',
      event_type: 'new_baby',
      source: 'self_reported',
      confidence_score: 0.95,
      risk_tier: 'low',
      created_at: new Date().toISOString(),
    });

    const [events, briefs, notifications, client] = await Promise.all([
      import('../../src/routes/events'),
      import('../../src/routes/briefs'),
      import('../../src/routes/notifications'),
      import('../../src/routes/client'),
    ]);
    const app = makeApp({
      events: events.default,
      briefs: briefs.default,
      notifications: notifications.default,
      client: client.default,
    });

    const approve = await request(app).post('/api/briefs/brief-1/approve').send({
      advisor_id: 'advisor-1',
      edited_content: store.briefs[0].content,
    });
    expect(approve.status).toBe(200);
    expect(approve.body.notification_queued).toBe(true);
    expect(store.briefs[0].status).toBe('approved');
    expect(store.notifications[0].status).toBe('delivered');

    const notifList = await request(app).get('/api/notifications?client_id=client-uuid-001');
    expect(notifList.status).toBe(200);
    expect(notifList.body.notifications).toHaveLength(1);

    const clientView = await request(app).get(
      '/api/client/briefs/brief-1?client_id=client-uuid-001',
    );
    expect(clientView.status).toBe(200);
    expect(store.notifications[0].status).toBe('opened');
  });
});

describe('Full flow — high-consequence manual classification', () => {
  test('lump_sum_deposit enters queue and generates on classify', async () => {
    const [events, briefs, notifications, client] = await Promise.all([
      import('../../src/routes/events'),
      import('../../src/routes/briefs'),
      import('../../src/routes/notifications'),
      import('../../src/routes/client'),
    ]);
    const app = makeApp({
      events: events.default,
      briefs: briefs.default,
      notifications: notifications.default,
      client: client.default,
    });
    const intake = await request(app).post('/api/events').send({
      client_id: 'client-uuid-001',
      event_type: 'lump_sum_deposit',
      source: 'self_reported',
    });
    expect(intake.status).toBe(201);
    expect(intake.body.status).toBe('pending_classification');
    expect(store.briefs).toHaveLength(0);

    const queue = await request(app).get('/api/events/high-consequence');
    expect(queue.status).toBe(200);
    expect(queue.body.events.length).toBeGreaterThanOrEqual(1);

    const classify = await request(app)
      .post(`/api/events/${intake.body.event_id}/classify`)
      .send({ advisor_id: 'advisor-1', decision: 'generate' });
    expect(classify.status).toBe(200);
    expect(classify.body.brief_id).toBeTruthy();
    await new Promise((r) => setTimeout(r, 1));
    expect(store.briefs.some((b) => b.id === classify.body.brief_id && b.status === 'pending')).toBe(
      true,
    );
  });
});
