"use strict";
// ---------------------------------------------------------------------------
// Classification Engine
//
// Pure function — no side effects, no database calls, no audit logging.
// Classifies a detected life event as low or high consequence and applies
// the confidence threshold to determine the routing decision.
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyEvent = classifyEvent;
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/**
 * Confidence threshold — events below this score are held for review
 * regardless of their risk tier.
 */
var CONFIDENCE_THRESHOLD = 0.650;
/**
 * High-consequence event types that always route to the manual
 * classification queue, regardless of confidence score.
 */
var HIGH_CONSEQUENCE_TYPES = new Set([
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
function classifyEvent(input) {
    var event_type = input.event_type, confidence_score = input.confidence_score;
    var risk_tier = HIGH_CONSEQUENCE_TYPES.has(event_type) ? 'high' : 'low';
    var routing_decision;
    if (confidence_score < CONFIDENCE_THRESHOLD) {
        // Below threshold — hold regardless of risk tier
        routing_decision = 'held';
    }
    else if (risk_tier === 'high') {
        // High consequence — route to manual classification queue
        routing_decision = 'pending_classification';
    }
    else {
        // Low consequence + above threshold — auto-generate brief
        routing_decision = 'auto_generate';
    }
    return {
        event_type: event_type,
        confidence_score: confidence_score,
        risk_tier: risk_tier,
        routing_decision: routing_decision,
    };
}
