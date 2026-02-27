import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const clientId = req.query.client_id;

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return res.status(400).json({ error: 'client_id query param is required' });
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(
        'id, brief_id, client_id, headline, delivered_at, opened_at, status',
      )
      .eq('client_id', clientId)
      .order('delivered_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      notifications: (data ?? []).map((row: any) => ({
        notification_id: row.id,
        brief_id: row.brief_id,
        client_id: row.client_id,
        headline: row.headline,
        delivered_at: row.delivered_at
          ? new Date(row.delivered_at).toISOString()
          : null,
        opened_at: row.opened_at ? new Date(row.opened_at).toISOString() : null,
        status: row.status,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

export default router;
