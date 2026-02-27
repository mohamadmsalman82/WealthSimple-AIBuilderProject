import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Rule {
  id: string;
  rule_type: string;
  rule_content: Record<string, any>; // JSONB — already a parsed object from Supabase, never a string
  effective_date: string;
  expiry_date: string | null;
}

// ---------------------------------------------------------------------------
// Event-type → relevant rule_type mapping
// ---------------------------------------------------------------------------

const EVENT_RULE_MAP: Record<string, string[]> = {
  new_baby: ['ccb_monthly', 'resp_cesg', 'quebec_parental_benefits'],
  new_job: ['rrsp_contribution', 'tfsa_annual_limit'],
  income_drop: ['rrsp_contribution', 'tfsa_annual_limit'],
  marriage: ['tfsa_annual_limit', 'rrsp_contribution', 'fhsa'],
  divorce: ['tfsa_annual_limit', 'rrsp_contribution'],
  spouse_death: ['rrsp_contribution', 'tfsa_annual_limit'],
  lump_sum_deposit: ['tfsa_annual_limit', 'rrsp_contribution'],
  inheritance: ['tfsa_annual_limit', 'rrsp_contribution'],
  home_purchase: ['fhsa', 'first_time_home_buyers_tax_credit'],
  debt_payoff: ['tfsa_annual_limit', 'rrsp_contribution'],
  child_leaving: ['resp_cesg', 'tfsa_annual_limit'],
  retirement_approaching: ['rrsp_contribution', 'tfsa_annual_limit'],
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetches currently active Canadian financial rules from the database and
 * returns only those relevant to the given life event type and province.
 *
 * Called by the Brief Generation Engine before every Claude API request so
 * that Claude receives hard constraints aligned with current Canadian tax law.
 *
 * @param eventType - The life event type (e.g. "new_baby", "marriage").
 * @param province  - Two-letter Canadian province code (e.g. "ON", "QC").
 * @returns Filtered, sorted array of active rules (most recent first).
 *          Never returns an empty array — falls back to all active rules.
 */
export async function getRulesForContext(
  eventType: string,
  province: string,
): Promise<Rule[]> {
  // ------------------------------------------------------------------
  // Step 1 — Date filter: fetch all currently active rules
  // ------------------------------------------------------------------
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('recommendation_rules')
    .select('id, rule_type, rule_content, effective_date, expiry_date')
    .lte('effective_date', today)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`);

  if (error) throw error;

  const activeRules: Rule[] = (data ?? []) as Rule[];

  // ------------------------------------------------------------------
  // Step 2 — Event type relevance filter
  // ------------------------------------------------------------------
  let relevantTypes = EVENT_RULE_MAP[eventType];

  if (relevantTypes) {
    // For new_baby: include quebec_parental_benefits only when province is QC
    if (eventType === 'new_baby' && province !== 'QC') {
      relevantTypes = relevantTypes.filter(
        (rt) => rt !== 'quebec_parental_benefits',
      );
    }

    let filtered = activeRules.filter((rule) =>
      relevantTypes.includes(rule.rule_type),
    );

    // ------------------------------------------------------------------
    // Step 4 — Empty result fallback
    // ------------------------------------------------------------------
    if (filtered.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[rulesEngine] No rules matched after filtering for eventType="${eventType}", province="${province}". Returning all active rules as fallback.`,
      );
      filtered = activeRules;
    }

    // ------------------------------------------------------------------
    // Step 3 — Sort by effective_date descending (most recent first)
    // ------------------------------------------------------------------
    return filtered.sort(
      (a, b) =>
        new Date(b.effective_date).getTime() -
        new Date(a.effective_date).getTime(),
    );
  }

  // Unknown / future event types — return all active rules as fallback
  // eslint-disable-next-line no-console
  console.warn(
    `[rulesEngine] Unknown eventType="${eventType}". Returning all active rules as fallback.`,
  );

  return activeRules.sort(
    (a, b) =>
      new Date(b.effective_date).getTime() -
      new Date(a.effective_date).getTime(),
  );
}
