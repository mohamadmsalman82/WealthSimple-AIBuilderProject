"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBrief = generateBrief;
var crypto_1 = require("crypto");
var sdk_1 = require("@anthropic-ai/sdk");
var supabase_1 = require("../lib/supabase");
var audit_1 = require("../lib/audit");
// ---------------------------------------------------------------------------
// Validate required environment variable
// ---------------------------------------------------------------------------
var anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}
var anthropic = new sdk_1.default({ apiKey: anthropicApiKey });
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var MODEL = 'claude-sonnet-4-6';
var MAX_TOKENS = 1000;
var VALID_CTA_LINKS = new Set([
    '/client/accounts/tfsa',
    '/client/accounts/rrsp',
    '/client/accounts/fhsa',
    '/client/accounts/resp',
    '/client/tax',
    '/client/accounts/cash',
]);
// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------
function buildPrompt(verifiedData, eventType) {
    var rulesFormatted = verifiedData.rules
        .map(function (r, i) {
        return "".concat(i + 1, ". ").concat(r.rule_type, ": ").concat(JSON.stringify(r.rule_content));
    })
        .join('\n');
    return "You are a financial planning assistant operating inside a Canadian fintech platform. You are generating a plain-language brief for a licensed advisor to review before it is sent to a client. You do not send anything to the client \u2014 a human advisor reviews and approves everything you produce before it reaches anyone.\n\nClient context:\n".concat(JSON.stringify(verifiedData, null, 2), "\n\nApplicable Canadian financial rules:\n").concat(rulesFormatted, "\n\nLife event detected: ").concat(eventType, "\n\nGenerate a brief containing:\n1. A summary paragraph explaining what this life event means for this specific client's financial situation. Reference their actual numbers. Do not invent figures. Write in second person \u2014 address the advisor, not the client.\n2. Exactly three ranked actions, ordered by financial impact from highest to lowest.\n\nFor each action provide:\n- title: short, plain language, 5 words or fewer\n- explanation: 2-3 sentences, specific to this client's actual numbers and situation. Name the exact dollar amounts from their profile.\n- cta_label: the button label the client will see, e.g. \"Open TFSA\", \"Start contributing\", \"Learn more\"\n- cta_link: must be one of these exact paths and nothing else:\n    /client/accounts/tfsa\n    /client/accounts/rrsp\n    /client/accounts/fhsa\n    /client/accounts/resp\n    /client/tax\n    /client/accounts/cash\n\nRules you must follow without exception:\n- Never recommend contributing more than the client's available room as shown in their profile. If tfsa_room is ").concat(verifiedData.tfsa_room, ", do not suggest contributing more than $").concat(verifiedData.tfsa_room.toLocaleString(), " to their TFSA.\n- Never recommend opening an account the client already has unless the recommendation is to add contributions to it.\n- Never calculate numbers yourself. Every dollar figure in your response must come directly from the client context object provided. Do not derive, estimate, or approximate.\n- All recommendations must be permissible under the Canadian financial rules provided. Do not recommend anything that conflicts with those rules.\n- Do not recommend FHSA to a client who already has a home (infer from event type: if event is home_purchase, they just bought \u2014 FHSA is no longer relevant).\n- Do not recommend RESP unless the client has dependents > 0.\n- Write for a financially literate Canadian adult, not a financial expert. No jargon. No acronyms without explanation on first use.\n- Tone: warm, clear, specific. Never generic. Never promotional.\n- The advisor reading this brief should be able to approve it in under 60 seconds. Keep the summary under 100 words.\n\nRespond only with valid JSON. No preamble. No explanation. No markdown code fences. Raw JSON only, matching this exact shape:\n\n{\n  \"summary\": \"string\",\n  \"actions\": [\n    {\n      \"rank\": 1,\n      \"title\": \"string\",\n      \"explanation\": \"string\",\n      \"cta_label\": \"string\",\n      \"cta_link\": \"string\"\n    },\n    {\n      \"rank\": 2,\n      \"title\": \"string\",\n      \"explanation\": \"string\",\n      \"cta_label\": \"string\",\n      \"cta_link\": \"string\"\n    },\n    {\n      \"rank\": 3,\n      \"title\": \"string\",\n      \"explanation\": \"string\",\n      \"cta_label\": \"string\",\n      \"cta_link\": \"string\"\n    }\n  ]\n}");
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
function validateBriefContent(parsed) {
    if (typeof parsed !== 'object' || parsed === null)
        return false;
    var obj = parsed;
    if (typeof obj.summary !== 'string' || obj.summary.length === 0)
        return false;
    if (!Array.isArray(obj.actions) || obj.actions.length !== 3)
        return false;
    for (var i = 0; i < 3; i++) {
        var action = obj.actions[i];
        if (typeof action !== 'object' || action === null)
            return false;
        var a = action;
        if (a.rank !== i + 1)
            return false;
        if (typeof a.title !== 'string' || a.title.length === 0)
            return false;
        if (typeof a.explanation !== 'string' || a.explanation.length === 0)
            return false;
        if (typeof a.cta_label !== 'string' || a.cta_label.length === 0)
            return false;
        if (typeof a.cta_link !== 'string')
            return false;
    }
    return true;
}
/**
 * Validates that every cta_link in the brief content is one of the
 * permitted paths. Returns true if all links are valid.
 */
function validateCtaLinks(content) {
    return content.actions.every(function (action) { return VALID_CTA_LINKS.has(action.cta_link); });
}
// ---------------------------------------------------------------------------
// SHA-256 helper
// ---------------------------------------------------------------------------
function sha256(input) {
    return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
}
// ---------------------------------------------------------------------------
// Claude API call with CTA-link retry
// ---------------------------------------------------------------------------
/**
 * Calls Claude to generate a brief. If Claude returns invalid CTA links,
 * retries exactly once before throwing. Other failures (API error, invalid
 * JSON, wrong shape) throw immediately with no retry.
 */
function callClaudeWithRetry(verifiedData, eventType) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, maxAttempts, attempt, response, textBlock, rawText, parsed, briefContent, invalidLinks;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prompt = buildPrompt(verifiedData, eventType);
                    maxAttempts = 2;
                    attempt = 1;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxAttempts)) return [3 /*break*/, 4];
                    return [4 /*yield*/, anthropic.messages.create({
                            model: MODEL,
                            max_tokens: MAX_TOKENS,
                            messages: [{ role: 'user', content: prompt }],
                        })];
                case 2:
                    response = _a.sent();
                    textBlock = response.content.find(function (block) { return block.type === 'text'; });
                    if (!textBlock || textBlock.type !== 'text') {
                        throw new Error('Claude returned no text content');
                    }
                    rawText = textBlock.text.trim();
                    parsed = void 0;
                    try {
                        parsed = JSON.parse(rawText);
                    }
                    catch (_b) {
                        throw new Error("Claude returned invalid JSON: ".concat(rawText.substring(0, 200)));
                    }
                    // Validate shape
                    if (!validateBriefContent(parsed)) {
                        throw new Error("Claude response does not match expected brief shape: ".concat(rawText.substring(0, 200)));
                    }
                    briefContent = parsed;
                    // Validate CTA links — retry once if hallucinated
                    if (validateCtaLinks(briefContent)) {
                        return [2 /*return*/, briefContent];
                    }
                    invalidLinks = briefContent.actions
                        .filter(function (a) { return !VALID_CTA_LINKS.has(a.cta_link); })
                        .map(function (a) { return a.cta_link; });
                    if (attempt < maxAttempts) {
                        console.warn("[briefGenerator] Invalid CTA links detected: ".concat(invalidLinks.join(', '), ". Retrying (attempt ").concat(attempt, "/").concat(maxAttempts, ")..."));
                        return [3 /*break*/, 3];
                    }
                    throw new Error("Claude hallucinated CTA links after ".concat(maxAttempts, " attempts: ").concat(invalidLinks.join(', ')));
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: 
                // Unreachable — TypeScript requires a return
                throw new Error('Unexpected: exhausted retry loop without returning');
            }
        });
    });
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
function generateBrief(input) {
    return __awaiter(this, void 0, void 0, function () {
        var verifiedData, eventType, eventId, confidenceScore, existingBriefId, briefId, insertedByEngine, _a, insertedBrief, insertError, content, err_1, deleteError, contentJson, contentHash, updateError, deleteError, rulesVersion, today, ruleData, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    verifiedData = input.verifiedData, eventType = input.eventType, eventId = input.eventId, confidenceScore = input.confidenceScore, existingBriefId = input.existingBriefId;
                    insertedByEngine = false;
                    if (!existingBriefId) return [3 /*break*/, 1];
                    briefId = existingBriefId;
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .insert({
                        client_id: verifiedData.client_id,
                        event_id: eventId,
                        status: 'generating',
                    })
                        .select('id')
                        .single()];
                case 2:
                    _a = _c.sent(), insertedBrief = _a.data, insertError = _a.error;
                    if (insertError)
                        throw insertError;
                    if (!insertedBrief)
                        throw new Error('Failed to create brief record');
                    briefId = insertedBrief.id;
                    insertedByEngine = true;
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 8]);
                    return [4 /*yield*/, callClaudeWithRetry(verifiedData, eventType)];
                case 4:
                    content = _c.sent();
                    return [3 /*break*/, 8];
                case 5:
                    err_1 = _c.sent();
                    // Clean up zombie record only when this function inserted it
                    console.error('[briefGenerator] Brief generation failed:', err_1);
                    if (!insertedByEngine) return [3 /*break*/, 7];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('briefs')
                            .delete()
                            .eq('id', briefId)];
                case 6:
                    deleteError = (_c.sent()).error;
                    if (deleteError) {
                        console.error('[briefGenerator] Failed to delete zombie brief record:', deleteError);
                    }
                    _c.label = 7;
                case 7: throw err_1;
                case 8:
                    contentJson = JSON.stringify(content);
                    contentHash = sha256(contentJson);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('briefs')
                            .update({
                            status: 'pending',
                            content: content,
                            original_content_hash: contentHash,
                            final_content_hash: contentHash,
                            was_edited: false,
                        })
                            .eq('id', briefId)];
                case 9:
                    updateError = (_c.sent()).error;
                    if (!updateError) return [3 /*break*/, 12];
                    console.error('[briefGenerator] Failed to update brief record:', updateError);
                    if (!insertedByEngine) return [3 /*break*/, 11];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('briefs')
                            .delete()
                            .eq('id', briefId)];
                case 10:
                    deleteError = (_c.sent()).error;
                    if (deleteError) {
                        console.error('[briefGenerator] Failed to delete brief record after update failure:', deleteError);
                    }
                    _c.label = 11;
                case 11: throw updateError;
                case 12:
                    rulesVersion = 'unknown';
                    _c.label = 13;
                case 13:
                    _c.trys.push([13, 15, , 16]);
                    today = new Date().toISOString().split('T')[0];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('recommendation_rules')
                            .select('id')
                            .lte('effective_date', today)
                            .or("expiry_date.is.null,expiry_date.gte.".concat(today))
                            .order('effective_date', { ascending: false })
                            .limit(1)
                            .single()];
                case 14:
                    ruleData = (_c.sent()).data;
                    if (ruleData) {
                        rulesVersion = ruleData.id;
                    }
                    return [3 /*break*/, 16];
                case 15:
                    _b = _c.sent();
                    console.warn('[briefGenerator] Could not fetch rules_version for audit log');
                    return [3 /*break*/, 16];
                case 16: 
                // ------------------------------------------------------------------
                // Step 6 — Write audit log entry (never throws, never rolls back)
                // ------------------------------------------------------------------
                return [4 /*yield*/, (0, audit_1.logAudit)({
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
                    })];
                case 17:
                    // ------------------------------------------------------------------
                    // Step 6 — Write audit log entry (never throws, never rolls back)
                    // ------------------------------------------------------------------
                    _c.sent();
                    return [2 /*return*/, briefId];
            }
        });
    });
}
