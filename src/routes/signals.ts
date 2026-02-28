import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase';
import { runAllDetectors, type Transaction } from '../engines/signalMonitor';
import { classifyEvent, type EventType } from '../engines/classification';
import { fetchVerifiedData } from '../engines/dataFetcher';
import { generateBrief } from '../engines/briefGenerator';
import { logAudit } from '../lib/audit';

const router = Router();

/**
 * POST /api/signals/scan
 *
 * Runs the Account Signal Monitor across all clients that have transactions.
 * For each client:
 *   1. Fetches their full transaction history from the DB
 *   2. Runs all 6 detectors via runAllDetectors()
 *   3. Skips signals that already have a matching life_event (same client + event_type + source=account_signal)
 *   4. Creates a new life_event for each novel detection
 *   5. Classifies the event and kicks off brief generation if auto-routed
 *
 * Returns a summary of everything detected and created.
 */
router.post('/scan', async (_req: Request, res: Response) => {
  try {
    // ---- 1. Get distinct client_ids that have transactions ----
    const { data: txRows, error: txError } = await supabase
      .from('transactions')
      .select('client_id, id, amount, merchant_category, transaction_type, description, date')
      .order('client_id')
      .order('date', { ascending: false });

    if (txError) {
      return res.status(500).json({ error: txError.message });
    }

    if (!txRows || txRows.length === 0) {
      return res.status(200).json({
        message: 'No transactions found in database',
        clients_scanned: 0,
        signals_detected: 0,
        events_created: 0,
        results: [],
      });
    }

    // ---- 2. Group transactions by client_id ----
    const txByClient = new Map<string, Transaction[]>();
    for (const row of txRows) {
      const clientId = row.client_id as string;
      if (!txByClient.has(clientId)) {
        txByClient.set(clientId, []);
      }
      txByClient.get(clientId)!.push({
        id: row.id,
        client_id: row.client_id,
        amount: row.amount,
        merchant_category: row.merchant_category,
        transaction_type: row.transaction_type,
        description: row.description,
        date: row.date,
      });
    }

    // ---- 3. Fetch existing account_signal events to skip duplicates ----
    const { data: existingEvents, error: existingError } = await supabase
      .from('life_events')
      .select('client_id, event_type')
      .eq('source', 'account_signal');

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    const existingSet = new Set(
      (existingEvents ?? []).map((e: any) => `${e.client_id}::${e.event_type}`),
    );

    // ---- 4. Run detectors per client ----
    const results: Array<{
      client_id: string;
      event_type: string;
      confidence_score: number;
      status: string;
      event_id: string | null;
      skipped: boolean;
    }> = [];

    let signalsDetected = 0;
    let eventsCreated = 0;

    for (const [clientId, transactions] of txByClient.entries()) {
      const signals = runAllDetectors(transactions);

      for (const signal of signals) {
        signalsDetected++;

        // Skip if we already have this signal for this client
        const key = `${clientId}::${signal.event_type}`;
        if (existingSet.has(key)) {
          results.push({
            client_id: clientId,
            event_type: signal.event_type,
            confidence_score: signal.confidence_score,
            status: 'skipped_duplicate',
            event_id: null,
            skipped: true,
          });
          continue;
        }

        // Classify the event
        const classification = classifyEvent({
          event_type: signal.event_type as EventType,
          confidence_score: signal.confidence_score,
        });

        const eventStatus =
          classification.routing_decision === 'auto_generate'
            ? 'routed'
            : classification.routing_decision === 'held'
              ? 'held'
              : 'pending_classification';

        // Build a signal summary string
        const signalSummary = `Auto-detected by Account Signal Monitor — ${signal.event_type} pattern, confidence ${signal.confidence_score.toFixed(3)}`;

        // Insert the life_event
        const { data: eventRecord, error: insertError } = await supabase
          .from('life_events')
          .insert({
            client_id: clientId,
            event_type: signal.event_type,
            source: 'account_signal',
            confidence_score: signal.confidence_score,
            risk_tier: classification.risk_tier,
            signal_summary: signalSummary,
            status: eventStatus,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`[signals/scan] Failed to insert event for ${clientId}:`, insertError.message);
          results.push({
            client_id: clientId,
            event_type: signal.event_type,
            confidence_score: signal.confidence_score,
            status: 'insert_error',
            event_id: null,
            skipped: false,
          });
          continue;
        }

        const eventId = eventRecord!.id as string;
        eventsCreated++;

        // Mark as existing so we don't double-create in the same run
        existingSet.add(key);

        // Audit log — event_created
        await logAudit({
          actor_type: 'system',
          action: 'event_created',
          record_type: 'event',
          record_id: eventId,
          client_id: clientId,
          metadata: {
            event_type: signal.event_type,
            source: 'account_signal',
            confidence_score: signal.confidence_score,
            detected_by: 'signal_monitor_scan',
          },
        });

        // If auto-routed, log the routing and kick off brief generation
        if (eventStatus === 'routed') {
          await logAudit({
            actor_type: 'system',
            action: 'event_routed',
            record_type: 'event',
            record_id: eventId,
            client_id: clientId,
            metadata: {
              routing_decision: classification.routing_decision,
              confidence_score: signal.confidence_score,
              risk_tier: classification.risk_tier,
            },
          });

          // Fire-and-forget brief generation
          void (async () => {
            try {
              const verifiedData = await fetchVerifiedData(clientId, signal.event_type);
              await generateBrief({
                verifiedData,
                eventType: signal.event_type,
                eventId,
                confidenceScore: signal.confidence_score,
              });
            } catch (err) {
              console.error(`[signals/scan] Brief generation failed for event ${eventId}:`, err);
            }
          })();
        }

        if (eventStatus === 'held') {
          await logAudit({
            actor_type: 'system',
            action: 'event_held',
            record_type: 'event',
            record_id: eventId,
            client_id: clientId,
            metadata: {
              confidence_score: signal.confidence_score,
              reason: 'below_threshold',
            },
          });
        }

        results.push({
          client_id: clientId,
          event_type: signal.event_type,
          confidence_score: signal.confidence_score,
          status: eventStatus,
          event_id: eventId,
          skipped: false,
        });
      }
    }

    // ---- 5. Fetch client names for the response ----
    const clientIds = [...new Set(results.map((r) => r.client_id))];
    const { data: clientNames } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', clientIds);

    const nameMap = new Map((clientNames ?? []).map((c: any) => [c.id, c.name]));

    const enrichedResults = results.map((r) => ({
      ...r,
      client_name: nameMap.get(r.client_id) ?? 'Unknown',
    }));

    return res.status(200).json({
      message: `Scan complete. ${signalsDetected} signal(s) detected, ${eventsCreated} new event(s) created.`,
      clients_scanned: txByClient.size,
      signals_detected: signalsDetected,
      events_created: eventsCreated,
      results: enrichedResults,
    });
  } catch (err) {
    console.error('[signals/scan] Unexpected error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected error',
    });
  }
});

export default router;
