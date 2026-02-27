// ---------------------------------------------------------------------------
// Verified Data Fetcher
//
// Queries the clients table by client_id, calls getRulesForContext from
// rulesEngine.ts, and returns a verified data object that the Brief
// Generation Engine passes directly to Claude. The LLM never receives
// calculation requests — all numbers come from this object.
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase';
import { getRulesForContext, type Rule } from './rulesEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Verified data object shape — input to the Brief Generation Engine.
 * Every field comes from the database. Claude receives this as-is.
 */
export interface VerifiedClientData {
  client_id: string;
  name: string;
  age: number;
  province: string;
  income_bracket: string;
  accounts: string[];
  tfsa_room: number;
  rrsp_room: number;
  dependents: number;
  portfolio_total: number;
  rules: Array<{
    rule_type: string;
    rule_content: Record<string, any>;
    effective_date: string;
    expiry_date: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetches verified client data from the database and attaches relevant
 * financial rules for the given event type.
 *
 * @param clientId  - UUID of the client to fetch.
 * @param eventType - The life event type used to filter relevant rules.
 * @returns A VerifiedClientData object ready for the Brief Generation Engine.
 * @throws If the client is not found or the Supabase query fails.
 */
export async function fetchVerifiedData(
  clientId: string,
  eventType: string,
): Promise<VerifiedClientData> {
  // ------------------------------------------------------------------
  // Step 1 — Fetch the client record
  // ------------------------------------------------------------------
  const { data: client, error } = await supabase
    .from('clients')
    .select(
      'id, name, age, province, income_bracket, accounts, tfsa_room, rrsp_room, dependents, portfolio_total',
    )
    .eq('id', clientId)
    .single();

  if (error) throw error;
  if (!client) throw new Error(`Client not found: ${clientId}`);

  // ------------------------------------------------------------------
  // Step 2 — Fetch relevant rules for this event type and province
  // ------------------------------------------------------------------
  const rules: Rule[] = await getRulesForContext(eventType, client.province);

  // ------------------------------------------------------------------
  // Step 3 — Build and return the verified data object
  // ------------------------------------------------------------------
  return {
    client_id: client.id,
    name: client.name,
    age: client.age,
    province: client.province,
    income_bracket: client.income_bracket,
    accounts: client.accounts,
    tfsa_room: client.tfsa_room,
    rrsp_room: client.rrsp_room,
    dependents: client.dependents,
    portfolio_total: Number(client.portfolio_total),
    rules: rules.map((r) => ({
      rule_type: r.rule_type,
      rule_content: r.rule_content,
      effective_date: r.effective_date,
      expiry_date: r.expiry_date,
    })),
  };
}
