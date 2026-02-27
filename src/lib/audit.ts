import { supabase } from './supabase';

export type ActorType = 'system' | 'advisor' | 'client';

export type RecordType = 'event' | 'brief' | 'notification';

export type AuditAction =
  | 'event_created'
  | 'event_routed'
  | 'event_held'
  | 'event_classified'
  | 'event_dismissed'
  | 'event_escalated'
  | 'brief_generated'
  | 'brief_approved'
  | 'brief_rejected'
  | 'brief_flagged'
  | 'notification_sent';

export interface AuditParams {
  /**
   * Optional UUID of the actor performing the action.
   * System actions may omit this field.
   */
  actor_id?: string;
  /**
   * Type of actor performing the action.
   * Must match the audit_log.actor_type check constraint:
   *   "system" | "advisor" | "client"
   */
  actor_type: ActorType;
  /**
   * Action name. Must be one of the following:
   *   "event_created" | "event_routed" | "event_held" |
   *   "event_classified" | "event_dismissed" | "event_escalated" |
   *   "brief_generated" | "brief_approved" | "brief_rejected" |
   *   "brief_flagged" | "notification_sent"
   */
  action: AuditAction;
  /**
   * Type of record this action is about.
   * Must match the audit_log.record_type check constraint:
   *   "event" | "brief" | "notification"
   */
  record_type: RecordType;
  /**
   * UUID of the record this action is about.
   */
  record_id: string;
  /**
   * Optional UUID of the client associated with this action.
   */
  client_id?: string;
  /**
   * Arbitrary structured metadata associated with the action.
   *
   * CONFIDENCE SCORE RULE:
   * - Any metadata field named `confidence_score` must be a number in the
   *   range 0.000 to 0.999 (numeric(4,3) in Postgres).
   * - Never pass 1.0 — it exceeds the numeric precision and will be rejected.
   * - Self-reported events use 0.950.
   * - High-confidence signals cap at 0.999.
   *
   * METADATA SHAPES PER ACTION (for callers):
   *
   * - event_created:
   *     { event_type: string, source: string, confidence_score: number }
   *
   * - event_routed:
   *     { routing_decision: string, confidence_score: number, risk_tier: string }
   *
   * - event_held:
   *     { confidence_score: number, reason: "below_threshold" }
   *
   * - event_classified:
   *     { advisor_id: string, decision: string }
   *
   * - event_dismissed:
   *     { advisor_id: string }
   *
   * - event_escalated:
   *     { advisor_id: string }
   *
   * - brief_generated:
   *     {
   *       event_type: string;
   *       client_id: string;
   *       confidence_score: number;
   *       rules_version: string; // UUID of recommendation_rules record
   *       model_used: string;    // e.g. "claude-sonnet-4-6"
   *     }
   *
   * - brief_approved:
   *     {
   *       advisor_id: string;
   *       was_edited: boolean;
   *       original_content_hash: string;
   *       final_content_hash: string;
   *     }
   *
   * - brief_rejected:
   *     { advisor_id: string, rejection_reason: string }
   *
   * - brief_flagged:
   *     { advisor_id: string, flag_reason: string }
   *
   * - notification_sent:
   *     { brief_id: string, client_id: string, headline: string }
   */
  metadata: Record<string, any>;
}

/**
 * Append-only audit log writer.
 *
 * This function MUST NEVER THROW. If the insert fails for any reason,
 * it logs the error to console.error and returns silently so that
 * application routes are never taken down by audit failures.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const payload = {
      actor_id: params.actor_id ?? null,
      actor_type: params.actor_type,
      action: params.action,
      record_type: params.record_type,
      record_id: params.record_id,
      client_id: params.client_id ?? null,
      metadata: params.metadata,
    };

    const { error } = await supabase.from('audit_log').insert(payload);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[audit_log] Insert error', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: (error as any).code,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit_log] Unexpected error', {
      error:
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : err,
      params,
    });
  }
}

