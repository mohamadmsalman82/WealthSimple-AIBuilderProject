import { Router, type Request, type Response } from 'express';
import {
  classifyEvent,
  type EventType,
} from '../engines/classification';
import { fetchVerifiedData } from '../engines/dataFetcher';
import { generateBrief } from '../engines/briefGenerator';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabase';

const router = Router();

const VALID_EVENT_TYPES: ReadonlySet<EventType> = new Set([
  'new_baby',
  'new_job',
  'income_drop',
  'marriage',
  'divorce',
  'spouse_death',
  'lump_sum_deposit',
  'debt_payoff',
  'child_leaving',
  'retirement_approaching',
  'home_purchase',
  'inheritance',
]);

const VALID_CLASSIFICATION_DECISIONS = new Set(['generate', 'dismiss', 'escalate']);

function parsePositiveInt(input: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

router.post('/', async (req: Request, res: Response) => {
  const { client_id, event_type, source } = req.body as {
    client_id?: string;
    event_type?: string;
    source?: string;
  };

  if (!client_id || !event_type || source !== 'self_reported') {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  if (!VALID_EVENT_TYPES.has(event_type as EventType)) {
    return res.status(400).json({ error: 'Invalid event_type' });
  }

  const confidence_score = 0.95;
  const classification = classifyEvent({
    event_type: event_type as EventType,
    confidence_score,
  });

  const status =
    classification.routing_decision === 'auto_generate'
      ? 'routed'
      : classification.routing_decision === 'held'
        ? 'held'
        : 'pending_classification';

  try {
    const { data: eventRecord, error } = await supabase
      .from('life_events')
      .insert({
        client_id,
        event_type,
        source: 'self_reported',
        confidence_score,
        risk_tier: classification.risk_tier,
        status,
      })
      .select('id')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!eventRecord) {
      return res.status(500).json({ error: 'Failed to create event' });
    }

    const eventId = eventRecord.id as string;

    await logAudit({
      actor_id: client_id,
      actor_type: 'client',
      action: 'event_created',
      record_type: 'event',
      record_id: eventId,
      client_id,
      metadata: {
        event_type,
        source: 'self_reported',
        confidence_score,
      },
    });

    if (status === 'routed') {
      await logAudit({
        actor_type: 'system',
        action: 'event_routed',
        record_type: 'event',
        record_id: eventId,
        client_id,
        metadata: {
          routing_decision: classification.routing_decision,
          confidence_score,
          risk_tier: classification.risk_tier,
        },
      });

      void (async () => {
        try {
          const verifiedData = await fetchVerifiedData(client_id, event_type);
          await generateBrief({
            verifiedData,
            eventType: event_type,
            eventId,
            confidenceScore: confidence_score,
          });
        } catch (generationError) {
          console.error('[events] Async brief generation failed', generationError);
        }
      })();
    }

    if (status === 'held') {
      await logAudit({
        actor_type: 'system',
        action: 'event_held',
        record_type: 'event',
        record_id: eventId,
        client_id,
        metadata: {
          confidence_score,
          reason: 'below_threshold',
        },
      });
    }

    return res.status(201).json({
      event_id: eventId,
      status,
      confidence_score,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.get('/high-consequence', async (req: Request, res: Response) => {
  const status = String(req.query.status ?? 'pending_classification');
  const limit = parsePositiveInt(req.query.limit, 50);
  const offset = parsePositiveInt(req.query.offset, 0);

  try {
    const { data, count, error } = await supabase
      .from('life_events')
      .select(
        'id, client_id, event_type, source, confidence_score, signal_summary, created_at, clients(name)',
        { count: 'exact' },
      )
      .eq('risk_tier', 'high')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const events = (data ?? []).map((row: any) => ({
      event_id: row.id,
      client_id: row.client_id,
      client_name: row.clients?.name ?? '',
      event_type: row.event_type,
      source: row.source,
      confidence_score: Number(row.confidence_score),
      signal_summary: row.signal_summary,
      created_at: new Date(row.created_at).toISOString(),
    }));

    return res.status(200).json({
      events,
      total: count ?? 0,
      offset,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

router.post('/:event_id/classify', async (req: Request, res: Response) => {
  const { event_id } = req.params;
  const { advisor_id, decision } = req.body as {
    advisor_id?: string;
    decision?: string;
  };

  if (!event_id || !advisor_id || !decision || !VALID_CLASSIFICATION_DECISIONS.has(decision)) {
    return res.status(400).json({ error: 'Invalid request payload' });
  }

  try {
    const { data: eventRecord, error: fetchError } = await supabase
      .from('life_events')
      .select('id, client_id, event_type, confidence_score')
      .eq('id', event_id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!eventRecord) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const resolvedAt = new Date().toISOString();

    if (decision === 'generate') {
      const { data: briefRecord, error: briefInsertError } = await supabase
        .from('briefs')
        .insert({
          client_id: eventRecord.client_id,
          event_id: event_id,
          status: 'generating',
        })
        .select('id')
        .single();

      if (briefInsertError) {
        return res.status(500).json({ error: briefInsertError.message });
      }

      if (!briefRecord) {
        return res.status(500).json({ error: 'Failed to create brief record' });
      }

      const briefId = briefRecord.id as string;

      const { error: updateError } = await supabase
        .from('life_events')
        .update({
          status: 'routed',
          resolved_at: resolvedAt,
        })
        .eq('id', event_id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      await logAudit({
        actor_type: 'advisor',
        action: 'event_classified',
        record_type: 'event',
        record_id: String(event_id),
        client_id: eventRecord.client_id,
        metadata: {
          advisor_id,
          decision,
        },
      });

      void (async () => {
        try {
          const verifiedData = await fetchVerifiedData(
            eventRecord.client_id,
            eventRecord.event_type,
          );
          await generateBrief({
            verifiedData,
            eventType: eventRecord.event_type,
            eventId: String(event_id),
            confidenceScore: Number(eventRecord.confidence_score),
            existingBriefId: briefId,
          });
        } catch (generationError) {
          console.error('[events] Async classified brief generation failed', generationError);
        }
      })();

      return res.status(200).json({
        event_id,
        decision,
        brief_id: briefId,
        resolved_at: resolvedAt,
      });
    }

    const status = decision === 'dismiss' ? 'dismissed' : 'escalated';

    const { error: updateError } = await supabase
      .from('life_events')
      .update({
        status,
        resolved_at: resolvedAt,
      })
      .eq('id', event_id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    await logAudit({
      actor_type: 'advisor',
      action: decision === 'dismiss' ? 'event_dismissed' : 'event_escalated',
      record_type: 'event',
      record_id: String(event_id),
      client_id: eventRecord.client_id,
      metadata: {
        advisor_id,
      },
    });

    return res.status(200).json({
      event_id,
      decision,
      brief_id: null,
      resolved_at: resolvedAt,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

export default router;
