import { createHash } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabase';

const router = Router();

const VALID_REJECTION_REASONS = new Set([
  'misclassified_event',
  'wrong_client_context',
  'outdated_rules',
  'tone_inappropriate',
  'other',
]);

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parsePositiveInt(input: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

router.get('/', async (req: Request, res: Response) => {
  const status = String(req.query.status ?? 'pending');
  const limit = parsePositiveInt(req.query.limit, 50);
  const offset = parsePositiveInt(req.query.offset, 0);

  try {
    const { data, count, error } = await supabase
      .from('briefs')
      .select(
        'id, client_id, status, created_at, event_id, clients(name), life_events(event_type, source, confidence_score, risk_tier)',
        { count: 'exact' },
      )
      .eq('status', status)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const nowMs = Date.now();
    const briefs = (data ?? []).map((row: any) => {
      const createdAt = new Date(row.created_at).toISOString();
      const createdMs = new Date(row.created_at).getTime();
      const timeInQueueMinutes = Math.max(
        0,
        Math.floor((nowMs - createdMs) / 60000),
      );

      return {
        brief_id: row.id,
        client_id: row.client_id,
        client_name: row.clients?.name ?? '',
        event_type: row.life_events?.event_type ?? '',
        confidence_score: Number(row.life_events?.confidence_score ?? 0),
        source: row.life_events?.source ?? '',
        risk_tier: row.life_events?.risk_tier ?? '',
        status: row.status,
        created_at: createdAt,
        time_in_queue_minutes: timeInQueueMinutes,
      };
    });

    return res.status(200).json({
      briefs,
      total: count ?? 0,
      offset,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.get('/:brief_id', async (req: Request, res: Response) => {
  const { brief_id } = req.params;

  try {
    const { data, error } = await supabase
      .from('briefs')
      .select(
        `id, status, created_at, content, client_id,
         clients(client_id:id, name, age, province, income_bracket, accounts, tfsa_room, rrsp_room, dependents),
         life_events(event_type, source, confidence_score, risk_tier)`,
      )
      .eq('id', brief_id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    return res.status(200).json({
      brief_id: data.id,
      status: data.status,
      event_type: firstRelation<any>(data.life_events)?.event_type ?? '',
      confidence_score: Number(
        firstRelation<any>(data.life_events)?.confidence_score ?? 0,
      ),
      source: firstRelation<any>(data.life_events)?.source ?? '',
      risk_tier: firstRelation<any>(data.life_events)?.risk_tier ?? '',
      created_at: new Date(data.created_at).toISOString(),
      client: data.clients,
      content: data.content,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.post('/:brief_id/approve', async (req: Request, res: Response) => {
  const { brief_id } = req.params;
  const { advisor_id, edited_content } = req.body as {
    advisor_id?: string;
    edited_content?: Record<string, unknown>;
  };

  if (!advisor_id || !edited_content) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  try {
    const { data: existingBrief, error: fetchError } = await supabase
      .from('briefs')
      .select('id, client_id, original_content_hash')
      .eq('id', brief_id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!existingBrief) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    const originalHash = existingBrief.original_content_hash ?? '';
    const finalHash = sha256(JSON.stringify(edited_content));
    const wasEdited = originalHash !== finalHash;
    const approvedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('briefs')
      .update({
        status: 'approved',
        content: edited_content,
        final_content_hash: finalHash,
        was_edited: wasEdited,
        approved_at: approvedAt,
      })
      .eq('id', brief_id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    const headline = "We noticed something. Here's what it means for your money.";

    const { data: notificationRecord, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        brief_id,
        client_id: existingBrief.client_id,
        headline,
        status: 'delivered',
        delivered_at: approvedAt,
      })
      .select('id')
      .single();

    if (notificationError) {
      return res.status(500).json({ error: notificationError.message });
    }

    await logAudit({
      actor_type: 'advisor',
      action: 'brief_approved',
      record_type: 'brief',
      record_id: String(brief_id),
      client_id: existingBrief.client_id,
      metadata: {
        advisor_id,
        was_edited: wasEdited,
        original_content_hash: originalHash,
        final_content_hash: finalHash,
      },
    });

    if (notificationRecord?.id) {
      await logAudit({
        actor_type: 'system',
        action: 'notification_sent',
        record_type: 'notification',
        record_id: notificationRecord.id,
        client_id: existingBrief.client_id,
        metadata: {
          brief_id: String(brief_id),
          client_id: existingBrief.client_id,
          headline,
        },
      });
    }

    return res.status(200).json({
      brief_id,
      status: 'approved',
      approved_at: approvedAt,
      notification_queued: true,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.post('/:brief_id/reject', async (req: Request, res: Response) => {
  const { brief_id } = req.params;
  const { advisor_id, rejection_reason } = req.body as {
    advisor_id?: string;
    rejection_reason?: string;
  };

  if (
    !advisor_id ||
    !rejection_reason ||
    !VALID_REJECTION_REASONS.has(rejection_reason)
  ) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  const rejectedAt = new Date().toISOString();

  try {
    const { data: updatedBrief, error } = await supabase
      .from('briefs')
      .update({
        status: 'rejected',
        rejection_reason,
        rejected_at: rejectedAt,
      })
      .eq('id', brief_id)
      .select('id, client_id')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!updatedBrief) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    await logAudit({
      actor_type: 'advisor',
      action: 'brief_rejected',
      record_type: 'brief',
      record_id: String(brief_id),
      client_id: updatedBrief.client_id,
      metadata: {
        advisor_id,
        rejection_reason,
      },
    });

    return res.status(200).json({
      brief_id,
      status: 'rejected',
      rejected_at: rejectedAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.post('/:brief_id/flag', async (req: Request, res: Response) => {
  const { brief_id } = req.params;
  const { advisor_id, flag_reason } = req.body as {
    advisor_id?: string;
    flag_reason?: string;
  };

  if (!advisor_id || !flag_reason) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  const flaggedAt = new Date().toISOString();

  try {
    const { data: updatedBrief, error } = await supabase
      .from('briefs')
      .update({
        status: 'flagged',
        flag_reason,
        flagged_at: flaggedAt,
      })
      .eq('id', brief_id)
      .select('id, client_id')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!updatedBrief) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    await logAudit({
      actor_type: 'advisor',
      action: 'brief_flagged',
      record_type: 'brief',
      record_id: String(brief_id),
      client_id: updatedBrief.client_id,
      metadata: {
        advisor_id,
        flag_reason,
      },
    });

    return res.status(200).json({
      brief_id,
      status: 'flagged',
      flagged_at: flaggedAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

export default router;
