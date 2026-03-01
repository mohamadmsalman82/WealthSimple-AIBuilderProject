import 'dotenv/config';
import { supabase } from '../src/lib/supabase';

/**
 * Seeds the transactions table with 6 life event signal clusters (20 total
 * transactions) for the Account Signal Monitor to detect on demo day.
 *
 * Idempotent — deletes all transactions for the 6 target clients before
 * inserting fresh rows.
 *
 * Target clients (from Session 4 seed data):
 *   A — Priya Sharma        (new_baby)
 *   B — Tyler Nakamura       (new_job / payroll spike)
 *   C — Wei Zhang            (lump_sum_deposit)
 *   D — James Chen           (debt_payoff)
 *   E — Omar Hassan          (home_purchase)
 *   F — Sophie Gagnon        (inheritance)
 */

const TARGET_NAMES = [
  'Priya Sharma',       // A — new_baby
  'Tyler Nakamura',     // B — new_job
  'Wei Zhang',          // C — lump_sum_deposit
  'James Chen',         // D — debt_payoff
  'Omar Hassan',        // E — home_purchase
  'Sophie Gagnon',      // F — inheritance
  'Marcus Williams',    // G — new_job (RBC → TD Bank payroll spike)
];

// ---------------------------------------------------------------------------
// Cluster builders — each returns an array of transaction row objects
// ---------------------------------------------------------------------------

function clusterA(clientId: string) {
  // new_baby — 4 debits spread across 2 weeks in January 2026
  return [
    {
      client_id: clientId,
      amount: 234.50,
      merchant_category: 'baby_retail',
      transaction_type: 'debit',
      description: 'Babies R Us - Etobicoke',
      date: '2026-01-05',
    },
    {
      client_id: clientId,
      amount: 187.20,
      merchant_category: 'baby_retail',
      transaction_type: 'debit',
      description: "Carter's Baby - Scarborough",
      date: '2026-01-08',
    },
    {
      client_id: clientId,
      amount: 95.00,
      merchant_category: 'medical',
      transaction_type: 'debit',
      description: 'Lifelab Medical',
      date: '2026-01-12',
    },
    {
      client_id: clientId,
      amount: 67.40,
      merchant_category: 'pharmacy',
      transaction_type: 'debit',
      description: 'Shoppers Drug Mart',
      date: '2026-01-16',
    },
  ];
}

function clusterB(clientId: string) {
  // new_job / payroll spike — 8 transactions over 4 months
  // Prior employer: Shopify Inc, $2,100 bi-weekly (Oct–Dec 2025)
  // New employer: Stripe Canada, $3,000 bi-weekly (Jan 2026) — 43% spike
  return [
    // October 2025
    {
      client_id: clientId,
      amount: 2100.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Shopify Inc',
      date: '2025-10-03',
    },
    {
      client_id: clientId,
      amount: 2100.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Shopify Inc',
      date: '2025-10-17',
    },
    // November 2025
    {
      client_id: clientId,
      amount: 2100.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Shopify Inc',
      date: '2025-11-07',
    },
    {
      client_id: clientId,
      amount: 2100.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Shopify Inc',
      date: '2025-11-21',
    },
    // December 2025
    {
      client_id: clientId,
      amount: 2100.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Shopify Inc',
      date: '2025-12-05',
    },
    {
      client_id: clientId,
      amount: 2100.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Shopify Inc',
      date: '2025-12-19',
    },
    // January 2026 — new employer, 43% higher ($4,200/mo → $6,000/mo)
    {
      client_id: clientId,
      amount: 3000.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Stripe Canada',
      date: '2026-01-10',
    },
    {
      client_id: clientId,
      amount: 3000.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - Stripe Canada',
      date: '2026-01-24',
    },
  ];
}

function clusterC(clientId: string) {
  // lump_sum_deposit — single high-value credit, routes to manual classification
  return [
    {
      client_id: clientId,
      amount: 47500.00,
      merchant_category: 'transfer_in',
      transaction_type: 'credit',
      description: 'Wire Transfer Received',
      date: '2026-01-20',
    },
  ];
}

function clusterD(clientId: string) {
  // debt_payoff — 3 recurring debits Oct–Dec 2025. NO January 2026.
  // The absence of the January payment is the signal.
  return [
    {
      client_id: clientId,
      amount: 652.00,
      merchant_category: 'loan_payment',
      transaction_type: 'debit',
      description: 'TD Auto Loan Payment',
      date: '2025-10-15',
    },
    {
      client_id: clientId,
      amount: 652.00,
      merchant_category: 'loan_payment',
      transaction_type: 'debit',
      description: 'TD Auto Loan Payment',
      date: '2025-11-15',
    },
    {
      client_id: clientId,
      amount: 652.00,
      merchant_category: 'loan_payment',
      transaction_type: 'debit',
      description: 'TD Auto Loan Payment',
      date: '2025-12-15',
    },
    // NO JANUARY 2026 ENTRY — the absence is the signal
  ];
}

function clusterE(clientId: string) {
  // home_purchase — 3 debits across 3 weeks in January 2026
  return [
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'legal_services',
      transaction_type: 'debit',
      description: 'Barrister & Solicitor - Closing Costs',
      date: '2026-01-08',
    },
    {
      client_id: clientId,
      amount: 8500.00,
      merchant_category: 'land_transfer',
      transaction_type: 'debit',
      description: 'Ontario Land Transfer Tax',
      date: '2026-01-15',
    },
    {
      client_id: clientId,
      amount: 87000.00,
      merchant_category: 'transfer_out',
      transaction_type: 'debit',
      description: 'Wire Transfer - Real Estate',
      date: '2026-01-22',
    },
  ];
}

function clusterF(clientId: string) {
  // inheritance — single high-value credit, routes to manual classification
  // Description MUST contain the word "estate" for Account Signal Monitor detection
  return [
    {
      client_id: clientId,
      amount: 125000.00,
      merchant_category: 'transfer_in',
      transaction_type: 'credit',
      description: 'TD Estate Services - Distribution',
      date: '2026-01-18',
    },
  ];
}

function clusterG(clientId: string) {
  // new_job — Marcus Williams switches from RBC to TD Bank (Oct–Dec 2025 old,
  // Jan 2026 new employer). $2,800 bi-weekly → $3,900 bi-weekly (~39% spike).
  return [
    // October 2025 — RBC
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - RBC Royal Bank',
      date: '2025-10-03',
    },
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - RBC Royal Bank',
      date: '2025-10-17',
    },
    // November 2025 — RBC
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - RBC Royal Bank',
      date: '2025-11-07',
    },
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - RBC Royal Bank',
      date: '2025-11-21',
    },
    // December 2025 — RBC
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - RBC Royal Bank',
      date: '2025-12-05',
    },
    {
      client_id: clientId,
      amount: 2800.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - RBC Royal Bank',
      date: '2025-12-19',
    },
    // January 2026 — new employer TD Bank, ~43% higher pay ($5,600/mo → $8,000/mo)
    {
      client_id: clientId,
      amount: 4000.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - TD Bank Canada',
      date: '2026-01-10',
    },
    {
      client_id: clientId,
      amount: 4000.00,
      merchant_category: 'payroll',
      transaction_type: 'credit',
      description: 'Direct Deposit - TD Bank Canada',
      date: '2026-01-24',
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Resolving client IDs...');

  const { data: clientRows, error: lookupError } = await supabase
    .from('clients')
    .select('id, name')
    .in('name', TARGET_NAMES);

  if (lookupError) throw lookupError;

  if (!clientRows || clientRows.length !== 7) {
    const foundNames = (clientRows ?? []).map((c) => c.name);
    const missing = TARGET_NAMES.filter((n) => !foundNames.includes(n));
    throw new Error(
      `Expected 7 clients, got ${clientRows?.length ?? 0}. ` +
        `Missing: ${missing.join(', ')}. ` +
        'Check names match seed data exactly.',
    );
  }

  console.log('Found 7 target clients.');

  // Build a lookup by name → id
  const clientMap: Record<string, string> = {};
  for (const row of clientRows) {
    clientMap[row.name] = row.id;
  }

  const clientIds = Object.values(clientMap);

  // Idempotent: delete all existing transactions for these 7 clients
  console.log('Clearing existing transactions for target clients...');
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .in('client_id', clientIds);

  if (deleteError) throw deleteError;

  // Build all clusters
  const clusterARows = clusterA(clientMap['Priya Sharma']);
  const clusterBRows = clusterB(clientMap['Tyler Nakamura']);
  const clusterCRows = clusterC(clientMap['Wei Zhang']);
  const clusterDRows = clusterD(clientMap['James Chen']);
  const clusterERows = clusterE(clientMap['Omar Hassan']);
  const clusterFRows = clusterF(clientMap['Sophie Gagnon']);
  const clusterGRows = clusterG(clientMap['Marcus Williams']);

  const allTransactions = [
    ...clusterARows,
    ...clusterBRows,
    ...clusterCRows,
    ...clusterDRows,
    ...clusterERows,
    ...clusterFRows,
    ...clusterGRows,
  ];

  // Insert all at once
  const { error: insertError } = await supabase
    .from('transactions')
    .insert(allTransactions);

  if (insertError) throw insertError;

  console.log(`Seeding Client A (new_baby)... ${clusterARows.length} rows`);
  console.log(`Seeding Client B (new_job)... ${clusterBRows.length} rows`);
  console.log(`Seeding Client C (lump_sum_deposit)... ${clusterCRows.length} row`);
  console.log(`Seeding Client D (debt_payoff)... ${clusterDRows.length} rows`);
  console.log(`Seeding Client E (home_purchase)... ${clusterERows.length} rows`);
  console.log(`Seeding Client F (inheritance)... ${clusterFRows.length} row`);
  console.log(`Seeding Client G (new_job — Marcus Williams)... ${clusterGRows.length} rows`);
  console.log(`Done. ${allTransactions.length} transactions seeded.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
