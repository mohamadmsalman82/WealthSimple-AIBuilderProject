import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

function parsePositiveInt(input: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

router.get('/', async (req: Request, res: Response) => {
  const clientId = req.query.client_id;
  const advisorId = req.query.advisor_id;
  const eventType = req.query.event_type;
  const from = req.query.from;
  const to = req.query.to;
  const limit = parsePositiveInt(req.query.limit, 50);
  const offset = parsePositiveInt(req.query.offset, 0);

  try {
    let query = supabase
      .from('audit_log')
      .select(
        'id, actor_id, actor_type, action, record_type, record_id, client_id, metadata, timestamp',
        { count: 'exact' },
      )
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeof clientId === 'string' && clientId.length > 0) {
      query = query.eq('client_id', clientId);
    }

    if (typeof advisorId === 'string' && advisorId.length > 0) {
      query = query.eq('actor_id', advisorId);
    }

    if (typeof eventType === 'string' && eventType.length > 0) {
      query = query.eq('metadata->>event_type', eventType);
    }

    if (typeof from === 'string' && from.length > 0) {
      query = query.gte('timestamp', from);
    }

    if (typeof to === 'string' && to.length > 0) {
      query = query.lte('timestamp', to);
    }

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      entries: (data ?? []).map((row: any) => ({
        log_id: row.id,
        actor_id: row.actor_id,
        actor_type: row.actor_type,
        action: row.action,
        record_type: row.record_type,
        record_id: row.record_id,
        client_id: row.client_id,
        metadata: row.metadata ?? {},
        timestamp: new Date(row.timestamp).toISOString(),
      })),
      total: count ?? 0,
      offset,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

export default router;
