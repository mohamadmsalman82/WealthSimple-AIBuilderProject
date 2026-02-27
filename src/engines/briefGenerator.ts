// ---------------------------------------------------------------------------
// Brief Generation Engine
//
// Takes a verified client data object and event type, calls Claude to generate
// a financial planning brief, validates the response, writes it to the briefs
// table, and logs the action to the audit log.
//
// Status flow:
//   1. Insert brief record with status 'generating'
//   2. Call Claude API (claude-sonnet-4-6)
//   3. Validate response shape and CTA links (retry once on invalid links)
//   4. Compute SHA-256 content hashes
//   5. Update brief record to status 'pending' with content
//   6. Write audit log entry
//   7. Return brief_id
//
// On failure: delete the zombie record so the advisor queue stays clean.
// ---------------------------------------------------------------------------

import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/audit';
import type { VerifiedClientData } from './dataFetcher';

// ---------------------------------------------------------------------------
// Validate required environment variable
// ---------------------------------------------------------------------------

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

const anthropic = new Anthropic({ apiKey: anthropicApiKey });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;

const VALID_CTA_LINKS: ReadonlySet<string> = new Set([
  '/client/accounts/tfsa',
  '/client/accounts/rrsp',
  '/client/accounts/fhsa',
  '/client/accounts/resp',
  '/client/tax',
  '/client/accounts/cash',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BriefAction {
  rank: number;
  title: string;
  explanation: string;
  cta_label: string;
  cta_link: string;
}

export interface BriefContent {
  summary: string;
  actions: [BriefAction, BriefAction, BriefAction];
}

export interface BriefGenerationInput {
  verifiedData: VerifiedClientData;
  eventType: string;
  eventId: string;
  confidenceScore: number;
  existingBriefId?: string;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(
  verifiedData: VerifiedClientData,
  eventType: string,
): string {
  const rulesFormatted = verifiedData.rules
    .map(
      (r, i) =>
        `${i + 1}. ${r.rule_type}: ${JSON.stringify(r.rule_content)}`,
    )
    .join('\n');

  return `You are a financial planning assistant operating inside a Canadian fintech platform. You are generating a plain-language brief for a licensed advisor to review before it is sent to a client. You do not send anything to the client — a human advisor reviews and approves everything you produce before it reaches anyone.

Client context:
${JSON.stringify(verifiedData, null, 2)}

Applicable Canadian financial rules:
${rulesFormatted}

Life event detected: ${eventType}

Generate a brief containing:
1. A summary paragraph explaining what this life event means for this specific client's financial situation. Reference their actual numbers. Do not invent figures. Write in second person — address the advisor, not the client.
2. Exactly three ranked actions, ordered by financial impact from highest to lowest.

For each action provide:
- title: short, plain language, 5 words or fewer
- explanation: 2-3 sentences, specific to this client's actual numbers and situation. Name the exact dollar amounts from their profile.
- cta_label: the button label the client will see, e.g. "Open TFSA", "Start contributing", "Learn more"
- cta_link: must be one of these exact paths and nothing else:
    /client/accounts/tfsa
    /client/accounts/rrsp
    /client/accounts/fhsa
    /client/accounts/resp
    /client/tax
    /client/accounts/cash

Rules you must follow without exception:
- Never recommend contributing more than the client's available room as shown in their profile. If tfsa_room is ${verifiedData.tfsa_room}, do not suggest contributing more than $${verifiedData.tfsa_room.toLocaleString()} to their TFSA.
- Never recommend opening an account the client already has unless the recommendation is to add contributions to it.
- Never calculate numbers yourself. Every dollar figure in your response must come directly from the client context object provided. Do not derive, estimate, or approximate.
- All recommendations must be permissible under the Canadian financial rules provided. Do not recommend anything that conflicts with those rules.
- Do not recommend FHSA to a client who already has a home (infer from event type: if event is home_purchase, they just bought — FHSA is no longer relevant).
- Do not recommend RESP unless the client has dependents > 0.
- Write for a financially literate Canadian adult, not a financial expert. No jargon. No acronyms without explanation on first use.
- Tone: warm, clear, specific. Never generic. Never promotional.
- The advisor reading this brief should be able to approve it in under 60 seconds. Keep the summary under 100 words.

Respond only with valid JSON. No preamble. No explanation. No markdown code fences. Raw JSON only, matching this exact shape:

{
  "summary": "string",
  "actions": [
    {
      "rank": 1,
      "title": "string",
      "explanation": "string",
      "cta_label": "string",
      "cta_link": "string"
    },
    {
      "rank": 2,
      "title": "string",
      "explanation": "string",
      "cta_label": "string",
      "cta_link": "string"
    },
    {
      "rank": 3,
      "title": "string",
      "explanation": "string",
      "cta_label": "string",
      "cta_link": "string"
    }
  ]
}`;
}

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

/**
 * Validates that the parsed JSON matches the exact BriefContent shape:
 * - summary: non-empty string
 * - actions: array of exactly 3 objects with sequential ranks 1, 2, 3
 * - each action has title, explanation, cta_label (non-empty strings), cta_link (string)
 */
function validateBriefContent(parsed: unknown): parsed is BriefContent {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.summary !== 'string' || obj.summary.length === 0) return false;
  if (!Array.isArray(obj.actions) || obj.actions.length !== 3) return false;

  for (let i = 0; i < 3; i++) {
    const action = obj.actions[i];
    if (typeof action !== 'object' || action === null) return false;
    const a = action as Record<string, unknown>;

    if (a.rank !== i + 1) return false;
    if (typeof a.title !== 'string' || a.title.length === 0) return false;
    if (typeof a.explanation !== 'string' || a.explanation.length === 0) return false;
    if (typeof a.cta_label !== 'string' || a.cta_label.length === 0) return false;
    if (typeof a.cta_link !== 'string') return false;
  }

  return true;
}

/**
 * Validates that every cta_link in the brief content is one of the
 * permitted paths. Returns true if all links are valid.
 */
function validateCtaLinks(content: BriefContent): boolean {
  return content.actions.every((action) => VALID_CTA_LINKS.has(action.cta_link));
}

// ---------------------------------------------------------------------------
// SHA-256 helper
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ---------------------------------------------------------------------------
// Claude API call with CTA-link retry
// ---------------------------------------------------------------------------

/**
 * Calls Claude to generate a brief. If Claude returns invalid CTA links,
 * retries exactly once before throwing. Other failures (API error, invalid
 * JSON, wrong shape) throw immediately with no retry.
 */
async function callClaudeWithRetry(
  verifiedData: VerifiedClientData,
  eventType: string,
): Promise<BriefContent> {
  const prompt = buildPrompt(verifiedData, eventType);
  const maxAttempts = 2; // 1 initial + 1 retry for CTA issues

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude returned no text content');
    }

    const rawText = textBlock.text.trim();

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(
        `Claude returned invalid JSON: ${rawText.substring(0, 200)}`,
      );
    }

    // Validate shape
    if (!validateBriefContent(parsed)) {
      throw new Error(
        `Claude response does not match expected brief shape: ${rawText.substring(0, 200)}`,
      );
    }

    const briefContent = parsed as BriefContent;

    // Validate CTA links — retry once if hallucinated
    if (validateCtaLinks(briefContent)) {
      return briefContent;
    }

    const invalidLinks = briefContent.actions
      .filter((a) => !VALID_CTA_LINKS.has(a.cta_link))
      .map((a) => a.cta_link);

    if (attempt < maxAttempts) {
      console.warn(
        `[briefGenerator] Invalid CTA links detected: ${invalidLinks.join(', ')}. Retrying (attempt ${attempt}/${maxAttempts})...`,
      );
      continue;
    }

    throw new Error(
      `Claude hallucinated CTA links after ${maxAttempts} attempts: ${invalidLinks.join(', ')}`,
    );
  }

  // Unreachable — TypeScript requires a return
  throw new Error('Unexpected: exhausted retry loop without returning');
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generates a financial planning brief for a client life event.
 *
 * 1. Creates a brief record with status 'generating'
 * 2. Calls Claude API to produce the brief content
 * 3. Validates and writes the content, updating status to 'pending'
 * 4. Logs a 'brief_generated' audit entry
 * 5. Returns the brief UUID
 *
 * On failure, the brief record is deleted to prevent zombie records
 * from polluting the advisor queue.
 *
 * @param input - Verified client data, event type, event ID, and confidence score.
 * @returns The UUID of the newly created brief.
 * @throws If Claude fails, the response is invalid, or the database write fails.
 */
export async function generateBrief(
  input: BriefGenerationInput,
): Promise<string> {
  const { verifiedData, eventType, eventId, confidenceScore, existingBriefId } =
    input;

  // ------------------------------------------------------------------
  // Step 1 — Use existing placeholder brief OR insert status 'generating'
  // ------------------------------------------------------------------
  let briefId: string;
  let insertedByEngine = false;

  if (existingBriefId) {
    briefId = existingBriefId;
  } else {
    const { data: insertedBrief, error: insertError } = await supabase
      .from('briefs')
      .insert({
        client_id: verifiedData.client_id,
        event_id: eventId,
        status: 'generating',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    if (!insertedBrief) throw new Error('Failed to create brief record');

    briefId = insertedBrief.id;
    insertedByEngine = true;
  }

  // ------------------------------------------------------------------
  // Step 2 — Call Claude API (with CTA-link retry)
  // ------------------------------------------------------------------
  let content: BriefContent;
  try {
    content = await callClaudeWithRetry(verifiedData, eventType);
  } catch (err) {
    // Clean up zombie record only when this function inserted it
    console.error('[briefGenerator] Brief generation failed:', err);

    if (insertedByEngine) {
      const { error: deleteError } = await supabase
        .from('briefs')
        .delete()
        .eq('id', briefId);

      if (deleteError) {
        console.error(
          '[briefGenerator] Failed to delete zombie brief record:',
          deleteError,
        );
      }
    }

    throw err;
  }

  // ------------------------------------------------------------------
  // Step 3 — Compute SHA-256 content hashes
  // ------------------------------------------------------------------
  const contentJson = JSON.stringify(content);
  const contentHash = sha256(contentJson);

  // ------------------------------------------------------------------
  // Step 4 — Update brief record: status → 'pending', write content
  // ------------------------------------------------------------------
  const { error: updateError } = await supabase
    .from('briefs')
    .update({
      status: 'pending',
      content,
      original_content_hash: contentHash,
      final_content_hash: contentHash,
      was_edited: false,
    })
    .eq('id', briefId);

  if (updateError) {
    console.error(
      '[briefGenerator] Failed to update brief record:',
      updateError,
    );

    // Attempt cleanup only when this function inserted the brief record
    if (insertedByEngine) {
      const { error: deleteError } = await supabase
        .from('briefs')
        .delete()
        .eq('id', briefId);

      if (deleteError) {
        console.error(
          '[briefGenerator] Failed to delete brief record after update failure:',
          deleteError,
        );
      }
    }

    throw updateError;
  }

  // ------------------------------------------------------------------
  // Step 5 — Determine rules_version for audit compliance tracking
  // ------------------------------------------------------------------
  let rulesVersion = 'unknown';
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: ruleData } = await supabase
      .from('recommendation_rules')
      .select('id')
      .lte('effective_date', today)
      .or(`expiry_date.is.null,expiry_date.gte.${today}`)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (ruleData) {
      rulesVersion = ruleData.id;
    }
  } catch {
    console.warn(
      '[briefGenerator] Could not fetch rules_version for audit log',
    );
  }

  // ------------------------------------------------------------------
  // Step 6 — Write audit log entry (never throws, never rolls back)
  // ------------------------------------------------------------------
  await logAudit({
    actor_type: 'system',
    action: 'brief_generated',
    record_type: 'brief',
    record_id: briefId,
    client_id: verifiedData.client_id,
    metadata: {
      event_type: eventType,
      client_id: verifiedData.client_id,
      confidence_score: confidenceScore,
      rules_version: rulesVersion,
      model_used: MODEL,
    },
  });

  return briefId;
}
