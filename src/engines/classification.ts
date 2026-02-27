// ---------------------------------------------------------------------------
// Classification Engine
//
// Pure function — no side effects, no database calls, no audit logging.
// Classifies a detected life event as low or high consequence and applies
// the confidence threshold to determine the routing decision.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Valid event types matching the life_events.event_type check constraint.
 */
export type EventType =
  | 'new_baby'
  | 'new_job'
  | 'income_drop'
  | 'marriage'
  | 'divorce'
  | 'spouse_death'
  | 'lump_sum_deposit'
  | 'debt_payoff'
  | 'child_leaving'
  | 'retirement_approaching'
  | 'home_purchase'
  | 'inheritance';

/**
 * Risk tier matching the life_events.risk_tier check constraint.
 */
export type RiskTier = 'low' | 'high';

/**
 * Routing decision produced by the classification engine.
 */
export type RoutingDecision =
  | 'auto_generate'          // Low consequence + above threshold → generate brief automatically
  | 'pending_classification' // High consequence → route to manual classification queue
  | 'held';                  // Below confidence threshold → hold for review

export interface ClassificationInput {
  event_type: EventType;
  confidence_score: number; // 0.000–0.999
}

export interface ClassificationResult {
  event_type: EventType;
  confidence_score: number;
  risk_tier: RiskTier;
  routing_decision: RoutingDecision;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Confidence threshold — events below this score are held for review
 * regardless of their risk tier.
 */
const CONFIDENCE_THRESHOLD = 0.650;

/**
 * High-consequence event types that always route to the manual
 * classification queue, regardless of confidence score.
 */
const HIGH_CONSEQUENCE_TYPES: ReadonlySet<EventType> = new Set([
  'lump_sum_deposit',
  'spouse_death',
  'divorce',
  'income_drop',
]);

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Classifies a life event and returns the routing decision.
 *
 * Decision logic:
 * 1. If confidence_score < 0.650 → held (below threshold)
 * 2. If event_type is high-consequence → pending_classification (manual queue)
 * 3. Otherwise → auto_generate (proceed to brief generation)
 *
 * This is a pure function with no side effects. Audit logging happens
 * at the route layer, not here.
 *
 * @param input - The detected event type and its confidence score.
 * @returns Classification result with risk tier and routing decision.
 */
export function classifyEvent(input: ClassificationInput): ClassificationResult {
  const { event_type, confidence_score } = input;

  const risk_tier: RiskTier = HIGH_CONSEQUENCE_TYPES.has(event_type) ? 'high' : 'low';

  let routing_decision: RoutingDecision;

  if (confidence_score < CONFIDENCE_THRESHOLD) {
    // Below threshold — hold regardless of risk tier
    routing_decision = 'held';
  } else if (risk_tier === 'high') {
    // High consequence — route to manual classification queue
    routing_decision = 'pending_classification';
  } else {
    // Low consequence + above threshold — auto-generate brief
    routing_decision = 'auto_generate';
  }

  return {
    event_type,
    confidence_score,
    risk_tier,
    routing_decision,
  };
}
