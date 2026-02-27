import 'dotenv/config';
import { supabase } from '../src/lib/supabase';

/**
 * Seeds the recommendation_rules table with the 7 Canadian financial rules
 * used by the Brief Generation Engine to constrain Claude API calls.
 *
 * Idempotent — uses delete-then-insert so running twice does not duplicate rows.
 */

const rules = [
  // Rule 1 — TFSA Annual Limit
  {
    rule_type: 'tfsa_annual_limit',
    rule_content: {
      limit: 7000,
      currency: 'CAD',
      year: 2025,
      description: 'Annual TFSA contribution limit for 2025',
      notes: 'Unused room carries forward from prior years indefinitely',
    },
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
  },

  // Rule 2 — RRSP Contribution
  {
    rule_type: 'rrsp_contribution',
    rule_content: {
      deadline: '60 days after December 31 of the tax year',
      deduction_limit_formula:
        '18% of prior year earned income minus pension adjustment',
      annual_max: 31560,
      currency: 'CAD',
      year: 2025,
      description: 'RRSP contribution deadline and deduction limit for 2025',
    },
    effective_date: '2025-01-01',
    expiry_date: '2025-12-31',
  },

  // Rule 3 — RESP CESG
  {
    rule_type: 'resp_cesg',
    rule_content: {
      grant_rate: 0.2,
      annual_contribution_eligible: 2500,
      max_annual_grant: 500,
      lifetime_grant_max: 7200,
      lifetime_contribution_max: 50000,
      currency: 'CAD',
      description:
        'Canada Education Savings Grant — 20% on first $2,500 contributed per year',
    },
    effective_date: '2025-01-01',
    expiry_date: null,
  },

  // Rule 4 — CCB Monthly
  {
    rule_type: 'ccb_monthly',
    rule_content: {
      description: 'Canada Child Benefit monthly amounts for 2025',
      under_6: {
        max_annual: 7787,
        max_monthly: 648.91,
      },
      age_6_to_17: {
        max_annual: 6570,
        max_monthly: 547.5,
      },
      income_reduction_starts_at: 36502,
      currency: 'CAD',
      notes:
        'Benefit reduced above income threshold based on number of children',
    },
    effective_date: '2025-07-01',
    expiry_date: '2026-06-30',
  },

  // Rule 5 — FHSA
  {
    rule_type: 'fhsa',
    rule_content: {
      annual_limit: 8000,
      lifetime_limit: 40000,
      currency: 'CAD',
      eligibility: 'Canadian resident, first-time home buyer, age 18+',
      tax_treatment:
        'Contributions tax-deductible, qualifying withdrawals tax-free',
      description:
        'First Home Savings Account limits and eligibility for 2025',
    },
    effective_date: '2023-04-01',
    expiry_date: null,
  },

  // Rule 6 — First-Time Home Buyers Tax Credit
  {
    rule_type: 'first_time_home_buyers_tax_credit',
    rule_content: {
      claim_amount: 10000,
      tax_credit_value: 1500,
      currency: 'CAD',
      eligibility:
        'First-time home buyer or not owned a home in current year or prior 4 years',
      description:
        'First-Time Home Buyers Tax Credit — $10,000 claim = $1,500 credit',
    },
    effective_date: '2022-01-01',
    expiry_date: null,
  },

  // Rule 7 — Quebec Parental Benefits (QPIP)
  {
    rule_type: 'quebec_parental_benefits',
    rule_content: {
      province: 'QC',
      program: 'QPIP',
      description:
        'Quebec Parental Insurance Plan replaces federal EI parental benefits for Quebec residents',
      basic_plan_rate: 0.55,
      special_plan_rate: 0.75,
      max_insurable_earnings: 94000,
      notes:
        'Quebec residents do not receive federal EI parental benefits — QPIP is the equivalent program',
      currency: 'CAD',
    },
    effective_date: '2025-01-01',
    expiry_date: null,
  },
];

async function main() {
  console.log('Seeding recommendation_rules...');

  // Idempotent: delete all existing rows, then insert fresh.
  // Using delete-then-insert because upsert requires a unique constraint on rule_type
  // which may not exist in the schema.
  const { error: deleteError } = await supabase
    .from('recommendation_rules')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('recommendation_rules')
    .insert(rules);

  if (insertError) throw insertError;

  console.log(`Inserted ${rules.length} rules successfully.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
