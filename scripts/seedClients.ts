import 'dotenv/config';
import { supabase } from '../src/lib/supabase';

// ---------------------------------------------------------------------------
// CRA annual TFSA contribution limits by year
// ---------------------------------------------------------------------------

const TFSA_LIMITS: Record<number, number> = {
  2009: 5000,
  2010: 5000,
  2011: 5000,
  2012: 5000,
  2013: 5500,
  2014: 5500,
  2015: 10000,
  2016: 5500,
  2017: 5500,
  2018: 5500,
  2019: 6000,
  2020: 6000,
  2021: 6000,
  2022: 6000,
  2023: 6500,
  2024: 7000,
  2025: 7000,
};

/**
 * Computes the cumulative TFSA contribution limit for a client of the given age.
 * Eligibility starts the year the client turned 18, capped at 2009 (TFSA inception).
 */
function computeTfsaCumulativeMax(age: number): number {
  const eligibleFrom = Math.max(2025 - age + 18, 2009);
  let sum = 0;
  for (let year = eligibleFrom; year <= 2025; year++) {
    sum += TFSA_LIMITS[year] ?? 0;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Client data — 25 Canadian clients
// ---------------------------------------------------------------------------
// Province distribution: ON=9, BC=6, QC=5, AB=2, MB=1, NS=1, SK=1 = 25
// NOTE: The original spec listed ON=10 which sums to 26, adjusted to ON=9
//       to meet the explicit total of 25 clients.
// ---------------------------------------------------------------------------

const clients = [
  // ── Ontario (ON) — 9 clients ──────────────────────────────────────────────

  {
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    age: 29,
    province: 'ON',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP', 'FHSA'],
    tfsa_room: 42000,   // cumulative max 76500 (eligible from 2014)
    rrsp_room: 15000,
    dependents: 1,
    avatar_initials: 'PS',
    portfolio_total: 45000.00,
  },
  {
    name: 'James Chen',
    email: 'james.chen@outlook.com',
    age: 42,
    province: 'ON',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 28000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 22000,
    dependents: 2,
    avatar_initials: 'JC',
    portfolio_total: 320000.00,
  },
  {
    name: 'Sarah Thompson',
    email: 'sarah.thompson@gmail.com',
    age: 35,
    province: 'ON',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 45000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 12500,
    dependents: 2,
    avatar_initials: 'ST',
    portfolio_total: 85000.00,
  },
  {
    name: 'Omar Hassan',
    email: 'omar.hassan@yahoo.com',
    age: 27,
    province: 'ON',
    income_bracket: '50000-75000',
    accounts: ['TFSA', 'FHSA'],
    tfsa_room: 38000,   // cumulative max 61000 (eligible from 2016)
    rrsp_room: 0,
    dependents: 0,
    avatar_initials: 'OH',
    portfolio_total: 18000.00,
  },
  {
    name: 'Emily Watson',
    email: 'emily.watson@gmail.com',
    age: 55,
    province: 'ON',
    income_bracket: '150000+',
    accounts: ['TFSA', 'RRSP', 'Cash'],
    tfsa_room: 12000,   // cumulative max 102000 (capped at 2009) — mostly maxed
    rrsp_room: 8000,
    dependents: 0,
    avatar_initials: 'EW',
    portfolio_total: 890000.00,
  },
  {
    name: 'Adebayo Okonkwo',
    email: 'adebayo.okonkwo@gmail.com',
    age: 31,
    province: 'ON',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'Crypto'],
    tfsa_room: 52000,   // cumulative max 87000 (eligible from 2012)
    rrsp_room: 0,
    dependents: 1,
    avatar_initials: 'AO',
    portfolio_total: 62000.00,
  },
  {
    name: 'Megan Liu',
    email: 'megan.liu@outlook.com',
    age: 23,
    province: 'ON',
    income_bracket: '30000-50000',
    accounts: ['TFSA'],
    tfsa_room: 28000,   // cumulative max 38500 (eligible from 2020)
    rrsp_room: 0,
    dependents: 0,
    avatar_initials: 'ML',
    portfolio_total: 8500.00,
  },
  {
    name: 'David Martin',
    email: 'david.martin@gmail.com',
    age: 48,
    province: 'ON',
    income_bracket: '150000+',
    accounts: ['TFSA', 'RRSP', 'Cash'],
    tfsa_room: 15000,   // cumulative max 102000 (capped at 2009) — mostly maxed
    rrsp_room: 18000,
    dependents: 3,
    avatar_initials: 'DM',
    portfolio_total: 650000.00,
  },
  {
    name: 'Anika Patel',
    email: 'anika.patel@hotmail.com',
    age: 37,
    province: 'ON',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP', 'FHSA'],
    tfsa_room: 35000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 25000,
    dependents: 2,
    avatar_initials: 'AP',
    portfolio_total: 195000.00,
  },

  // ── British Columbia (BC) — 6 clients ─────────────────────────────────────

  {
    name: 'Wei Zhang',
    email: 'wei.zhang@gmail.com',
    age: 33,
    province: 'BC',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 48000,   // cumulative max 97000 (eligible from 2010)
    rrsp_room: 14000,
    dependents: 1,
    avatar_initials: 'WZ',
    portfolio_total: 78000.00,
  },
  {
    name: 'Jessica Campbell',
    email: 'jessica.campbell@outlook.com',
    age: 45,
    province: 'BC',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP', 'Cash'],
    tfsa_room: 22000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 20000,
    dependents: 2,
    avatar_initials: 'JC',
    portfolio_total: 410000.00,
  },
  {
    name: 'Harpreet Gill',
    email: 'harpreet.gill@gmail.com',
    age: 26,
    province: 'BC',
    income_bracket: '50000-75000',
    accounts: ['TFSA', 'FHSA'],
    tfsa_room: 35000,   // cumulative max 55500 (eligible from 2017)
    rrsp_room: 0,
    dependents: 0,
    avatar_initials: 'HG',
    portfolio_total: 22000.00,
  },
  {
    name: 'Tyler Nakamura',
    email: 'tyler.nakamura@gmail.com',
    age: 30,
    province: 'BC',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP', 'Crypto'],
    tfsa_room: 50000,   // cumulative max 82000 (eligible from 2013)
    rrsp_room: 16000,
    dependents: 0,
    avatar_initials: 'TN',
    portfolio_total: 55000.00,
  },
  {
    name: 'Amara Diallo',
    email: 'amara.diallo@outlook.com',
    age: 38,
    province: 'BC',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 30000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 21000,
    dependents: 3,
    avatar_initials: 'AD',
    portfolio_total: 230000.00,
  },
  {
    name: 'Brandon Lee',
    email: 'brandon.lee@gmail.com',
    age: 52,
    province: 'BC',
    income_bracket: '150000+',
    accounts: ['TFSA', 'RRSP', 'Cash'],
    tfsa_room: 8000,    // cumulative max 102000 (capped at 2009) — nearly maxed
    rrsp_room: 10000,
    dependents: 0,
    avatar_initials: 'BL',
    portfolio_total: 780000.00,
  },

  // ── Quebec (QC) — 5 clients ──────────────────────────────────────────────

  {
    name: 'Jean-François Leblanc',
    email: 'jf.leblanc@videotron.ca',
    age: 41,
    province: 'QC',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 25000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 19000,
    dependents: 2,
    avatar_initials: 'JL',
    portfolio_total: 275000.00,
  },
  {
    name: 'Marie-Claire Tremblay',
    email: 'marie.tremblay@gmail.com',
    age: 34,
    province: 'QC',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP', 'FHSA'],
    tfsa_room: 40000,   // cumulative max 102000 (eligible from 2009)
    rrsp_room: 13500,
    dependents: 1,
    avatar_initials: 'MT',
    portfolio_total: 92000.00,
  },
  {
    name: 'Youssef Benali',
    email: 'youssef.benali@outlook.com',
    age: 28,
    province: 'QC',
    income_bracket: '50000-75000',
    accounts: ['TFSA', 'Crypto'],
    tfsa_room: 45000,   // cumulative max 71000 (eligible from 2015)
    rrsp_room: 0,
    dependents: 0,
    avatar_initials: 'YB',
    portfolio_total: 31000.00,
  },
  {
    name: 'Sophie Gagnon',
    email: 'sophie.gagnon@videotron.ca',
    age: 60,
    province: 'QC',
    income_bracket: '150000+',
    accounts: ['TFSA', 'RRSP', 'Cash'],
    tfsa_room: 5000,    // cumulative max 102000 (capped at 2009) — nearly maxed
    rrsp_room: 5000,
    dependents: 0,
    avatar_initials: 'SG',
    portfolio_total: 1150000.00,
  },
  {
    name: 'Philippe Côté',
    email: 'philippe.cote@gmail.com',
    age: 25,
    province: 'QC',
    income_bracket: '50000-75000',
    accounts: ['TFSA', 'FHSA'],
    tfsa_room: 35000,   // cumulative max 50000 (eligible from 2018)
    rrsp_room: 0,
    dependents: 0,
    avatar_initials: 'PC',
    portfolio_total: 12000.00,
  },

  // ── Alberta (AB) — 2 clients ──────────────────────────────────────────────

  {
    name: 'Tariq Mahmood',
    email: 'tariq.mahmood@gmail.com',
    age: 44,
    province: 'AB',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 20000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 23000,
    dependents: 3,
    avatar_initials: 'TM',
    portfolio_total: 380000.00,
  },
  {
    name: 'Chloe Anderson',
    email: 'chloe.anderson@outlook.com',
    age: 32,
    province: 'AB',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP', 'FHSA'],
    tfsa_room: 55000,   // cumulative max 92000 (eligible from 2011)
    rrsp_room: 16500,
    dependents: 1,
    avatar_initials: 'CA',
    portfolio_total: 68000.00,
  },

  // ── Manitoba (MB) — 1 client ──────────────────────────────────────────────

  {
    name: 'Nathan Fehr',
    email: 'nathan.fehr@gmail.com',
    age: 67,
    province: 'MB',
    income_bracket: '50000-75000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 0,       // cumulative max 102000 (capped at 2009) — fully maxed over decades
    rrsp_room: 3500,
    dependents: 0,
    avatar_initials: 'NF',
    portfolio_total: 520000.00,
  },

  // ── Nova Scotia (NS) — 1 client ──────────────────────────────────────────

  {
    name: 'Fatima Al-Rashid',
    email: 'fatima.alrashid@gmail.com',
    age: 39,
    province: 'NS',
    income_bracket: '75000-100000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 32000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 17000,
    dependents: 2,
    avatar_initials: 'FA',
    portfolio_total: 145000.00,
  },

  // ── Saskatchewan (SK) — 1 client ─────────────────────────────────────────

  {
    name: 'Ryan O\'Brien',
    email: 'ryan.obrien@yahoo.com',
    age: 22,
    province: 'SK',
    income_bracket: '30000-50000',
    accounts: ['TFSA'],
    tfsa_room: 22000,   // cumulative max 32500 (eligible from 2021)
    rrsp_room: 0,
    dependents: 0,
    avatar_initials: 'RO',
    portfolio_total: 5200.00,
  },

  // ── Ontario (ON) — added client ───────────────────────────────────────────

  {
    name: 'Marcus Williams',
    email: 'marcus.williams@gmail.com',
    age: 34,
    province: 'ON',
    income_bracket: '100000-150000',
    accounts: ['TFSA', 'RRSP'],
    tfsa_room: 38000,   // cumulative max 102000 (capped at 2009)
    rrsp_room: 20000,
    dependents: 1,
    avatar_initials: 'MW',
    portfolio_total: 145000.00,
  },
];

// ---------------------------------------------------------------------------
// Validate TFSA room before inserting
// ---------------------------------------------------------------------------

function validateTfsaRoom(): void {
  for (const client of clients) {
    const cumulativeMax = computeTfsaCumulativeMax(client.age);
    if (client.tfsa_room > cumulativeMax) {
      throw new Error(
        `TFSA room validation failed: ${client.name} (age ${client.age}) ` +
        `has tfsa_room ${client.tfsa_room} but cumulative max is ${cumulativeMax}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding clients...');

  // Validate TFSA room for all clients before inserting
  validateTfsaRoom();

  // Idempotent: delete all existing rows, then insert fresh.
  // Using delete-then-insert because upsert only handles conflicts on email
  // but does not remove stale rows from prior seeds.
  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) throw deleteError;

  const { error } = await supabase
    .from('clients')
    .insert(clients);

  if (error) throw error;

  console.log(`Inserted ${clients.length} clients successfully.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
