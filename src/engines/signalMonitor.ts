// ---------------------------------------------------------------------------
// Account Signal Monitor
//
// Six detector functions, one per transaction cluster pattern. Each takes
// the full recent transaction history for a single client_id and returns
// null if no signal is detected, or { event_type, confidence_score } if
// the signal fires. Confidence scores must never exceed 0.999.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of a transaction row from the transactions table.
 * `date` is a YYYY-MM-DD string (Postgres date type), not a timestamp.
 * `amount` is numeric(12,2) — Supabase returns it as a number or string
 * depending on size; always coerce with Number() before arithmetic.
 */
export interface Transaction {
  id: string;
  client_id: string;
  amount: number | string;   // numeric(12,2) — coerce with Number()
  merchant_category: string | null;
  transaction_type: 'credit' | 'debit';
  description: string | null;
  date: string;              // YYYY-MM-DD
}

/**
 * Signal detection result returned by each detector.
 */
export interface DetectedSignal {
  event_type: string;
  confidence_score: number;  // 0.000–0.999, never 1.0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the YYYY-MM key for a YYYY-MM-DD date string. */
function yearMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "2025-10-03" → "2025-10"
}

/** Difference in calendar days between two YYYY-MM-DD strings. */
function daysBetween(a: string, b: string): number {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.abs(msA - msB) / (1000 * 60 * 60 * 24);
}

/** Get the current YYYY-MM string (for "current month" checks). */
function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// ---------------------------------------------------------------------------
// DETECTOR 1 — new_baby
// ---------------------------------------------------------------------------

/**
 * Looks at merchant_category for baby_retail, pharmacy, medical.
 *
 * Logic:
 * - Count baby_retail transactions within any rolling 21-day window.
 * - Optionally corroborated by pharmacy or medical in the same window.
 *
 * Confidence:
 *   1x baby_retail: null (insufficient)
 *   2x baby_retail: 0.800
 *   2x baby_retail + 1x pharmacy/medical: 0.920
 */
export function detectNewBaby(transactions: Transaction[]): DetectedSignal | null {
  const babyTxns = transactions
    .filter((t) => t.merchant_category === 'baby_retail')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (babyTxns.length < 2) return null;

  // Check rolling 21-day windows anchored at each baby_retail transaction
  // The full 21-day window is used for both counting baby_retail and
  // checking pharmacy/medical corroboration.
  let bestConfidence = 0;

  for (const anchor of babyTxns) {
    const windowStart = anchor.date;
    // Compute the end of the 21-day window as a YYYY-MM-DD string
    const endDate = new Date(windowStart);
    endDate.setDate(endDate.getDate() + 21);
    const windowEnd = endDate.toISOString().split('T')[0];

    const babyInWindow = babyTxns.filter(
      (t) => t.date >= windowStart && t.date <= windowEnd,
    );

    if (babyInWindow.length < 2) continue;

    // Check for corroborating pharmacy or medical in the same 21-day window
    const hasCorroboration = transactions.some(
      (t) =>
        (t.merchant_category === 'pharmacy' ||
          t.merchant_category === 'medical') &&
        t.date >= windowStart &&
        t.date <= windowEnd,
    );

    if (hasCorroboration) {
      bestConfidence = Math.max(bestConfidence, 0.920);
    } else {
      bestConfidence = Math.max(bestConfidence, 0.800);
    }
  }

  if (bestConfidence > 0) {
    return { event_type: 'new_baby', confidence_score: bestConfidence };
  }

  return null;
}

// ---------------------------------------------------------------------------
// DETECTOR 2 — new_job (payroll spike)
// ---------------------------------------------------------------------------

/**
 * Looks at payroll credits (merchant_category = 'payroll', transaction_type = 'credit').
 *
 * Logic:
 * - Requires 3 prior months of payroll credit history.
 * - Computes average monthly payroll total for the 3 months prior to current month.
 * - If current month total is >= 40% higher: signal fires.
 *
 * Confidence:
 *   >= 40% spike: 0.880
 */
export function detectNewJob(transactions: Transaction[]): DetectedSignal | null {
  const payrollTxns = transactions.filter(
    (t) =>
      t.merchant_category === 'payroll' && t.transaction_type === 'credit',
  );

  if (payrollTxns.length === 0) return null;

  // Group by year-month
  const monthlyTotals: Record<string, number> = {};
  for (const t of payrollTxns) {
    const ym = yearMonth(t.date);
    monthlyTotals[ym] = (monthlyTotals[ym] ?? 0) + Number(t.amount);
  }

  const months = Object.keys(monthlyTotals).sort();

  if (months.length < 4) return null; // Need at least 3 prior + 1 current

  // The most recent month with payroll data is the "current" month to evaluate
  const latestMonth = months[months.length - 1];
  const priorMonths = months.slice(0, -1);

  if (priorMonths.length < 3) return null;

  // Use the 3 months immediately before the latest month
  const last3Prior = priorMonths.slice(-3);
  const priorTotal = last3Prior.reduce((sum, m) => sum + monthlyTotals[m], 0);
  const priorAvg = priorTotal / 3;

  if (priorAvg === 0) return null;

  const latestTotal = monthlyTotals[latestMonth];
  const increase = (latestTotal - priorAvg) / priorAvg;

  if (increase >= 0.40) {
    return { event_type: 'new_job', confidence_score: 0.880 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// DETECTOR 3 — lump_sum_deposit
// ---------------------------------------------------------------------------

/**
 * Looks at transfer_in credits with amount >= $25,000.
 *
 * Confidence:
 *   transfer_in credit >= $25,000: 0.950
 */
export function detectLumpSumDeposit(
  transactions: Transaction[],
): DetectedSignal | null {
  const match = transactions.find(
    (t) =>
      t.transaction_type === 'credit' &&
      t.merchant_category === 'transfer_in' &&
      Number(t.amount) >= 25000,
  );

  if (match) {
    return { event_type: 'lump_sum_deposit', confidence_score: 0.950 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// DETECTOR 4 — debt_payoff
// ---------------------------------------------------------------------------

/**
 * Looks at loan_payment debits. Signal fires when a recurring pattern
 * (3+ prior months) disappears in the current month.
 *
 * Confidence:
 *   Recurring 3+ months, absent current month: 0.800
 */
export function detectDebtPayoff(
  transactions: Transaction[],
): DetectedSignal | null {
  const loanTxns = transactions.filter(
    (t) =>
      t.merchant_category === 'loan_payment' &&
      t.transaction_type === 'debit',
  );

  if (loanTxns.length === 0) return null;

  // Group by year-month
  const monthsWithPayments = new Set<string>();
  for (const t of loanTxns) {
    monthsWithPayments.add(yearMonth(t.date));
  }

  const sortedMonths = [...monthsWithPayments].sort();

  if (sortedMonths.length < 3) return null;

  // The "current month" to check is the month after the last payment month.
  // If payments existed in Oct, Nov, Dec and are absent in Jan, the signal
  // fires when we look at Jan (the month following the last payment).
  const lastPaymentMonth = sortedMonths[sortedMonths.length - 1];
  const [year, month] = lastPaymentMonth.split('-').map(Number);
  const nextMonth =
    month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, '0')}`;

  // The next month must not have any loan payments
  if (!monthsWithPayments.has(nextMonth)) {
    // Verify at least 3 consecutive prior months had payments
    // (the sorted months of payments leading up to the gap)
    return { event_type: 'debt_payoff', confidence_score: 0.800 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// DETECTOR 5 — home_purchase
// ---------------------------------------------------------------------------

/**
 * Looks for all three within a rolling 30-day window:
 *   1. At least 1 legal_services transaction
 *   2. At least 1 land_transfer transaction
 *   3. At least 1 debit with amount >= $50,000
 *
 * Confidence:
 *   All three present in 30-day window: 0.920
 */
export function detectHomePurchase(
  transactions: Transaction[],
): DetectedSignal | null {
  const legalTxns = transactions.filter(
    (t) => t.merchant_category === 'legal_services',
  );
  const landTxns = transactions.filter(
    (t) => t.merchant_category === 'land_transfer',
  );
  const largeDeb = transactions.filter(
    (t) => t.transaction_type === 'debit' && Number(t.amount) >= 50000,
  );

  if (legalTxns.length === 0 || landTxns.length === 0 || largeDeb.length === 0) {
    return null;
  }

  // Check every combination for a 30-day window containing all three
  for (const legal of legalTxns) {
    for (const land of landTxns) {
      for (const large of largeDeb) {
        const dates = [legal.date, land.date, large.date].sort();
        if (daysBetween(dates[0], dates[2]) <= 30) {
          return { event_type: 'home_purchase', confidence_score: 0.920 };
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// DETECTOR 6 — inheritance
// ---------------------------------------------------------------------------

/**
 * Looks for a credit transaction with 'estate' in the description
 * (case-insensitive) and amount >= $10,000.
 *
 * Confidence:
 *   Credit with 'estate' in description and amount >= $10,000: 0.870
 */
export function detectInheritance(
  transactions: Transaction[],
): DetectedSignal | null {
  const match = transactions.find(
    (t) =>
      t.transaction_type === 'credit' &&
      Number(t.amount) >= 10000 &&
      t.description !== null &&
      t.description.toLowerCase().includes('estate'),
  );

  if (match) {
    return { event_type: 'inheritance', confidence_score: 0.870 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Run all detectors
// ---------------------------------------------------------------------------

/**
 * Convenience function — runs all six detectors against a client's
 * transaction history and returns all detected signals.
 *
 * @param transactions - Full recent transaction history for a single client.
 * @returns Array of detected signals (may be empty if no patterns match).
 */
export function runAllDetectors(
  transactions: Transaction[],
): DetectedSignal[] {
  const detectors = [
    detectNewBaby,
    detectNewJob,
    detectLumpSumDeposit,
    detectDebtPayoff,
    detectHomePurchase,
    detectInheritance,
  ];

  const results: DetectedSignal[] = [];

  for (const detector of detectors) {
    const signal = detector(transactions);
    if (signal) {
      results.push(signal);
    }
  }

  return results;
}
