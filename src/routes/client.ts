import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

const VALID_CLIENT_ACTIONS = new Set(['done', 'saved', 'dismissed']);

router.get('/briefs/:brief_id', async (req: Request, res: Response) => {
  const { brief_id } = req.params;
  const clientId = req.query.client_id;

  if (typeof clientId !== 'string' || clientId.length === 0) {
    return res.status(400).json({ error: 'client_id query param is required' });
  }

  try {
    // Single joined query — brief + event type + client profile
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select(
        `id, client_id, event_id, content, created_at,
         life_events(event_type, created_at),
         clients(name, province, age, income_bracket, accounts, tfsa_room, rrsp_room, dependents)`,
      )
      .eq('id', brief_id)
      .single();

    if (briefError) {
      return res.status(500).json({ error: briefError.message });
    }

    if (!brief) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    if (brief.client_id !== clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Unwrap joined relations (Supabase may return object or array)
    const eventRecord = Array.isArray(brief.life_events)
      ? brief.life_events[0] ?? null
      : brief.life_events ?? null;

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, delivered_at, status, action_states')
      .eq('brief_id', brief_id)
      .eq('client_id', clientId)
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (notificationError) {
      return res.status(500).json({ error: notificationError.message });
    }

    let openedNotification = notification;
    if (notification && notification.status === 'delivered') {
      const openedAt = new Date().toISOString();
      const { data: updatedNotification, error: updateError } = await supabase
        .from('notifications')
        .update({
          status: 'opened',
          opened_at: openedAt,
        })
        .eq('id', notification.id)
        .select('id, delivered_at, status, action_states')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      openedNotification = updatedNotification;
    }

    const actionStates = (openedNotification?.action_states ??
      {}) as Record<string, string>;
    const content = (brief.content ?? {}) as Record<string, any>;
    const actions = Array.isArray(content.actions) ? content.actions : [];

    return res.status(200).json({
      brief_id: brief.id,
      event_type: (eventRecord as any)?.event_type ?? '',
      event_context: (eventRecord as any)?.created_at
        ? `Detected on ${new Date((eventRecord as any).created_at).toISOString()}`
        : '',
      content: {
        ...content,
        actions: actions.map((action: any) => ({
          ...action,
          client_action: actionStates[String(action.rank)] ?? null,
        })),
      },
      delivered_at: openedNotification?.delivered_at
        ? new Date(openedNotification.delivered_at).toISOString()
        : new Date(brief.created_at).toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.post('/briefs/:brief_id/actions', async (req: Request, res: Response) => {
  const { brief_id } = req.params;
  const { client_id, action_rank, client_action } = req.body as {
    client_id?: string;
    action_rank?: number;
    client_action?: string;
  };

  if (
    !client_id ||
    typeof action_rank !== 'number' ||
    !Number.isInteger(action_rank) ||
    action_rank < 1 ||
    action_rank > 3 ||
    !client_action ||
    !VALID_CLIENT_ACTIONS.has(client_action)
  ) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  try {
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('id, client_id')
      .eq('id', brief_id)
      .single();

    if (briefError) {
      return res.status(500).json({ error: briefError.message });
    }

    if (!brief) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    if (brief.client_id !== client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id, action_states')
      .eq('brief_id', brief_id)
      .eq('client_id', client_id)
      .order('delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (notificationError) {
      return res.status(500).json({ error: notificationError.message });
    }

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found for brief' });
    }

    const nextActionStates = {
      ...((notification.action_states ?? {}) as Record<string, string>),
      [String(action_rank)]: client_action,
    };

    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        action_states: nextActionStates,
      })
      .eq('id', notification.id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      brief_id,
      action_rank,
      client_action,
      updated_at: updatedAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

export default router;
