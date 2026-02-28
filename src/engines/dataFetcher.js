"use strict";
// ---------------------------------------------------------------------------
// Verified Data Fetcher
//
// Queries the clients table by client_id, calls getRulesForContext from
// rulesEngine.ts, and returns a verified data object that the Brief
// Generation Engine passes directly to Claude. The LLM never receives
// calculation requests — all numbers come from this object.
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
exports.fetchVerifiedData = fetchVerifiedData;
var supabase_1 = require("../lib/supabase");
var rulesEngine_1 = require("./rulesEngine");
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
function fetchVerifiedData(clientId, eventType) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, client, error, rules;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase_1.supabase
                        .from('clients')
                        .select('id, name, age, province, income_bracket, accounts, tfsa_room, rrsp_room, dependents, portfolio_total')
                        .eq('id', clientId)
                        .single()];
                case 1:
                    _a = _b.sent(), client = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    if (!client)
                        throw new Error("Client not found: ".concat(clientId));
                    return [4 /*yield*/, (0, rulesEngine_1.getRulesForContext)(eventType, client.province)];
                case 2:
                    rules = _b.sent();
                    // ------------------------------------------------------------------
                    // Step 3 — Build and return the verified data object
                    // ------------------------------------------------------------------
                    return [2 /*return*/, {
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
                            rules: rules.map(function (r) { return ({
                                rule_type: r.rule_type,
                                rule_content: r.rule_content,
                                effective_date: r.effective_date,
                                expiry_date: r.expiry_date,
                            }); }),
                        }];
            }
        });
    });
}
