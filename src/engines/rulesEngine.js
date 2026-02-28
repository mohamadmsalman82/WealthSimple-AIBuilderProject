"use strict";
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
exports.getRulesForContext = getRulesForContext;
var supabase_1 = require("../lib/supabase");
// ---------------------------------------------------------------------------
// Event-type → relevant rule_type mapping
// ---------------------------------------------------------------------------
var EVENT_RULE_MAP = {
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
function getRulesForContext(eventType, province) {
    return __awaiter(this, void 0, void 0, function () {
        var today, _a, data, error, activeRules, relevantTypes, filtered;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    today = new Date().toISOString().split('T')[0];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('recommendation_rules')
                            .select('id, rule_type, rule_content, effective_date, expiry_date')
                            .lte('effective_date', today)
                            .or("expiry_date.is.null,expiry_date.gte.".concat(today))];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    activeRules = (data !== null && data !== void 0 ? data : []);
                    relevantTypes = EVENT_RULE_MAP[eventType];
                    if (relevantTypes) {
                        // For new_baby: include quebec_parental_benefits only when province is QC
                        if (eventType === 'new_baby' && province !== 'QC') {
                            relevantTypes = relevantTypes.filter(function (rt) { return rt !== 'quebec_parental_benefits'; });
                        }
                        filtered = activeRules.filter(function (rule) {
                            return relevantTypes.includes(rule.rule_type);
                        });
                        // ------------------------------------------------------------------
                        // Step 4 — Empty result fallback
                        // ------------------------------------------------------------------
                        if (filtered.length === 0) {
                            // eslint-disable-next-line no-console
                            console.warn("[rulesEngine] No rules matched after filtering for eventType=\"".concat(eventType, "\", province=\"").concat(province, "\". Returning all active rules as fallback."));
                            filtered = activeRules;
                        }
                        // ------------------------------------------------------------------
                        // Step 3 — Sort by effective_date descending (most recent first)
                        // ------------------------------------------------------------------
                        return [2 /*return*/, filtered.sort(function (a, b) {
                                return new Date(b.effective_date).getTime() -
                                    new Date(a.effective_date).getTime();
                            })];
                    }
                    // Unknown / future event types — return all active rules as fallback
                    // eslint-disable-next-line no-console
                    console.warn("[rulesEngine] Unknown eventType=\"".concat(eventType, "\". Returning all active rules as fallback."));
                    return [2 /*return*/, activeRules.sort(function (a, b) {
                            return new Date(b.effective_date).getTime() -
                                new Date(a.effective_date).getTime();
                        })];
            }
        });
    });
}
