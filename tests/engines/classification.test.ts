import { beforeEach, describe, expect, test, vi } from 'vitest';
import { classifyEvent } from '../../src/engines/classification';

beforeEach(() => {
  vi.clearAllMocks();
});

function toRouteStatus(result: { routing_decision: string }): string {
  if (result.routing_decision === 'auto_generate') return 'routed';
  return result.routing_decision;
}

describe('High-consequence classification', () => {
  test('lump_sum_deposit above threshold -> high/pending_classification', () => {
    const result = classifyEvent({
      event_type: 'lump_sum_deposit',
      confidence_score: 0.95,
    });
    expect(result.risk_tier).toBe('high');
    expect(toRouteStatus(result)).toBe('pending_classification');
  });

  test('spouse_death above threshold -> high/pending_classification', () => {
    const result = classifyEvent({ event_type: 'spouse_death', confidence_score: 0.8 });
    expect(result.risk_tier).toBe('high');
    expect(toRouteStatus(result)).toBe('pending_classification');
  });

  test('divorce above threshold -> high/pending_classification', () => {
    const result = classifyEvent({ event_type: 'divorce', confidence_score: 0.8 });
    expect(result.risk_tier).toBe('high');
    expect(toRouteStatus(result)).toBe('pending_classification');
  });

  test('income_drop above threshold -> high/pending_classification', () => {
    const result = classifyEvent({ event_type: 'income_drop', confidence_score: 0.8 });
    expect(result.risk_tier).toBe('high');
    expect(toRouteStatus(result)).toBe('pending_classification');
  });
});

describe('Low-consequence classification', () => {
  test.each([
    'new_baby',
    'new_job',
    'marriage',
    'debt_payoff',
    'home_purchase',
    'inheritance',
  ] as const)('%s above threshold -> low/routed', (event_type) => {
    const result = classifyEvent({ event_type, confidence_score: 0.8 });
    expect(result.risk_tier).toBe('low');
    expect(toRouteStatus(result)).toBe('routed');
  });
});

describe('Confidence threshold enforcement', () => {
  test('0.649 returns held regardless of event type', () => {
    const high = classifyEvent({ event_type: 'lump_sum_deposit', confidence_score: 0.649 });
    const low = classifyEvent({ event_type: 'new_baby', confidence_score: 0.649 });
    expect(toRouteStatus(high)).toBe('held');
    expect(toRouteStatus(low)).toBe('held');
  });

  test('0.650 is not held', () => {
    const result = classifyEvent({ event_type: 'new_baby', confidence_score: 0.65 });
    expect(toRouteStatus(result)).toBe('routed');
  });

  test('0.000 returns held', () => {
    const result = classifyEvent({ event_type: 'new_job', confidence_score: 0.0 });
    expect(toRouteStatus(result)).toBe('held');
  });

  test('boundary uses >= threshold', () => {
    const result = classifyEvent({ event_type: 'income_drop', confidence_score: 0.65 });
    expect(toRouteStatus(result)).toBe('pending_classification');
  });
});

describe('Edge cases', () => {
  test('unknown event_type defaults to low-consequence behavior', () => {
    const result = classifyEvent({
      event_type: 'unknown_event' as never,
      confidence_score: 0.8,
    });
    expect(result.risk_tier).toBe('low');
    expect(toRouteStatus(result)).toBe('routed');
  });

  test('confidence_score 0.999 is valid', () => {
    const result = classifyEvent({ event_type: 'new_baby', confidence_score: 0.999 });
    expect(result.confidence_score).toBe(0.999);
    expect(toRouteStatus(result)).toBe('routed');
  });

  test.todo(
    'confidence_score 1.0 should be rejected as invalid numeric(4,3)',
  );
});
