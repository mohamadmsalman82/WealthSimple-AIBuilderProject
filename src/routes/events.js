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
var express_1 = require("express");
var classification_1 = require("../engines/classification");
var dataFetcher_1 = require("../engines/dataFetcher");
var briefGenerator_1 = require("../engines/briefGenerator");
var audit_1 = require("../lib/audit");
var supabase_1 = require("../lib/supabase");
var router = (0, express_1.Router)();
var VALID_EVENT_TYPES = new Set([
    'new_baby',
    'new_job',
    'income_drop',
    'marriage',
    'divorce',
    'spouse_death',
    'lump_sum_deposit',
    'debt_payoff',
    'child_leaving',
    'retirement_approaching',
    'home_purchase',
    'inheritance',
]);
var VALID_CLASSIFICATION_DECISIONS = new Set(['generate', 'dismiss', 'escalate']);
function parsePositiveInt(input, fallback) {
    var parsed = Number.parseInt(String(input !== null && input !== void 0 ? input : ''), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}
router.post('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, client_id, event_type, source, rawConfidence, signal_summary, confidence_score, classification, status, _b, eventRecord, error, eventId_1, err_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, client_id = _a.client_id, event_type = _a.event_type, source = _a.source, rawConfidence = _a.confidence_score, signal_summary = _a.signal_summary;
                if (!client_id || !event_type) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                if (source !== 'self_reported' && source !== 'account_signal') {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                if (!VALID_EVENT_TYPES.has(event_type)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid event_type' })];
                }
                confidence_score = source === 'account_signal' && typeof rawConfidence === 'number'
                    ? rawConfidence
                    : 0.95;
                classification = (0, classification_1.classifyEvent)({
                    event_type: event_type,
                    confidence_score: confidence_score,
                });
                status = classification.routing_decision === 'auto_generate'
                    ? 'routed'
                    : classification.routing_decision === 'held'
                        ? 'held'
                        : 'pending_classification';
                _c.label = 1;
            case 1:
                _c.trys.push([1, 8, , 9]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('life_events')
                        .insert({
                        client_id: client_id,
                        event_type: event_type,
                        source: source,
                        confidence_score: confidence_score,
                        risk_tier: classification.risk_tier,
                        signal_summary: source === 'account_signal' ? (signal_summary !== null && signal_summary !== void 0 ? signal_summary : null) : null,
                        status: status,
                    })
                        .select('id')
                        .single()];
            case 2:
                _b = _c.sent(), eventRecord = _b.data, error = _b.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                if (!eventRecord) {
                    return [2 /*return*/, res.status(500).json({ error: 'Failed to create event' })];
                }
                eventId_1 = eventRecord.id;
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_id: source === 'self_reported' ? client_id : undefined,
                        actor_type: source === 'self_reported' ? 'client' : 'system',
                        action: 'event_created',
                        record_type: 'event',
                        record_id: eventId_1,
                        client_id: client_id,
                        metadata: {
                            event_type: event_type,
                            source: source,
                            confidence_score: confidence_score,
                        },
                    })];
            case 3:
                _c.sent();
                if (!(status === 'routed')) return [3 /*break*/, 5];
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_type: 'system',
                        action: 'event_routed',
                        record_type: 'event',
                        record_id: eventId_1,
                        client_id: client_id,
                        metadata: {
                            routing_decision: classification.routing_decision,
                            confidence_score: confidence_score,
                            risk_tier: classification.risk_tier,
                        },
                    })];
            case 4:
                _c.sent();
                void (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var verifiedData, generationError_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 3, , 4]);
                                return [4 /*yield*/, (0, dataFetcher_1.fetchVerifiedData)(client_id, event_type)];
                            case 1:
                                verifiedData = _a.sent();
                                return [4 /*yield*/, (0, briefGenerator_1.generateBrief)({
                                        verifiedData: verifiedData,
                                        eventType: event_type,
                                        eventId: eventId_1,
                                        confidenceScore: confidence_score,
                                    })];
                            case 2:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                generationError_1 = _a.sent();
                                console.error('[events] Async brief generation failed', generationError_1);
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); })();
                _c.label = 5;
            case 5:
                if (!(status === 'held')) return [3 /*break*/, 7];
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_type: 'system',
                        action: 'event_held',
                        record_type: 'event',
                        record_id: eventId_1,
                        client_id: client_id,
                        metadata: {
                            confidence_score: confidence_score,
                            reason: 'below_threshold',
                        },
                    })];
            case 6:
                _c.sent();
                _c.label = 7;
            case 7: return [2 /*return*/, res.status(201).json({
                    event_id: eventId_1,
                    status: status,
                    confidence_score: confidence_score,
                })];
            case 8:
                err_1 = _c.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_1 instanceof Error ? err_1.message : 'Unexpected error',
                    })];
            case 9: return [2 /*return*/];
        }
    });
}); });
router.get('/high-consequence', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status, limit, offset, _a, data, count, error, events, err_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                status = String((_b = req.query.status) !== null && _b !== void 0 ? _b : 'pending_classification');
                limit = parsePositiveInt(req.query.limit, 50);
                offset = parsePositiveInt(req.query.offset, 0);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('life_events')
                        .select('id, client_id, event_type, source, confidence_score, signal_summary, created_at, clients(name)', { count: 'exact' })
                        .eq('risk_tier', 'high')
                        .eq('status', status)
                        .order('created_at', { ascending: false })
                        .range(offset, offset + limit - 1)];
            case 2:
                _a = _c.sent(), data = _a.data, count = _a.count, error = _a.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                events = (data !== null && data !== void 0 ? data : []).map(function (row) {
                    var _a, _b;
                    return ({
                        event_id: row.id,
                        client_id: row.client_id,
                        client_name: (_b = (_a = row.clients) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '',
                        event_type: row.event_type,
                        source: row.source,
                        confidence_score: Number(row.confidence_score),
                        signal_summary: row.signal_summary,
                        created_at: new Date(row.created_at).toISOString(),
                    });
                });
                return [2 /*return*/, res.status(200).json({
                        events: events,
                        total: count !== null && count !== void 0 ? count : 0,
                        offset: offset,
                    })];
            case 3:
                err_2 = _c.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_2 instanceof Error ? err_2.message : 'Unexpected error',
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/:event_id/classify', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var event_id, _a, advisor_id, decision, _b, eventRecord_1, fetchError, resolvedAt, _c, briefRecord, briefInsertError, briefId_1, updateError_1, status_1, updateError, err_3;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                event_id = req.params.event_id;
                _a = req.body, advisor_id = _a.advisor_id, decision = _a.decision;
                if (!event_id || !advisor_id || !decision || !VALID_CLASSIFICATION_DECISIONS.has(decision)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 9, , 10]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('life_events')
                        .select('id, client_id, event_type, confidence_score')
                        .eq('id', event_id)
                        .single()];
            case 2:
                _b = _d.sent(), eventRecord_1 = _b.data, fetchError = _b.error;
                if (fetchError) {
                    return [2 /*return*/, res.status(500).json({ error: fetchError.message })];
                }
                if (!eventRecord_1) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                resolvedAt = new Date().toISOString();
                if (!(decision === 'generate')) return [3 /*break*/, 6];
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .insert({
                        client_id: eventRecord_1.client_id,
                        event_id: event_id,
                        status: 'generating',
                    })
                        .select('id')
                        .single()];
            case 3:
                _c = _d.sent(), briefRecord = _c.data, briefInsertError = _c.error;
                if (briefInsertError) {
                    return [2 /*return*/, res.status(500).json({ error: briefInsertError.message })];
                }
                if (!briefRecord) {
                    return [2 /*return*/, res.status(500).json({ error: 'Failed to create brief record' })];
                }
                briefId_1 = briefRecord.id;
                return [4 /*yield*/, supabase_1.supabase
                        .from('life_events')
                        .update({
                        status: 'routed',
                        resolved_at: resolvedAt,
                        advisor_id: advisor_id,
                    })
                        .eq('id', event_id)];
            case 4:
                updateError_1 = (_d.sent()).error;
                if (updateError_1) {
                    return [2 /*return*/, res.status(500).json({ error: updateError_1.message })];
                }
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_id: advisor_id,
                        actor_type: 'advisor',
                        action: 'event_classified',
                        record_type: 'event',
                        record_id: String(event_id),
                        client_id: eventRecord_1.client_id,
                        metadata: {
                            advisor_id: advisor_id,
                            decision: decision,
                        },
                    })];
            case 5:
                _d.sent();
                void (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var verifiedData, generationError_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 3, , 4]);
                                return [4 /*yield*/, (0, dataFetcher_1.fetchVerifiedData)(eventRecord_1.client_id, eventRecord_1.event_type)];
                            case 1:
                                verifiedData = _a.sent();
                                return [4 /*yield*/, (0, briefGenerator_1.generateBrief)({
                                        verifiedData: verifiedData,
                                        eventType: eventRecord_1.event_type,
                                        eventId: String(event_id),
                                        confidenceScore: Number(eventRecord_1.confidence_score),
                                        existingBriefId: briefId_1,
                                    })];
                            case 2:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                generationError_2 = _a.sent();
                                console.error('[events] Async classified brief generation failed', generationError_2);
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); })();
                return [2 /*return*/, res.status(200).json({
                        event_id: event_id,
                        decision: decision,
                        brief_id: briefId_1,
                        resolved_at: resolvedAt,
                    })];
            case 6:
                status_1 = decision === 'dismiss' ? 'dismissed' : 'escalated';
                return [4 /*yield*/, supabase_1.supabase
                        .from('life_events')
                        .update({
                        status: status_1,
                        resolved_at: resolvedAt,
                        advisor_id: advisor_id,
                    })
                        .eq('id', event_id)];
            case 7:
                updateError = (_d.sent()).error;
                if (updateError) {
                    return [2 /*return*/, res.status(500).json({ error: updateError.message })];
                }
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_id: advisor_id,
                        actor_type: 'advisor',
                        action: decision === 'dismiss' ? 'event_dismissed' : 'event_escalated',
                        record_type: 'event',
                        record_id: String(event_id),
                        client_id: eventRecord_1.client_id,
                        metadata: {
                            advisor_id: advisor_id,
                        },
                    })];
            case 8:
                _d.sent();
                return [2 /*return*/, res.status(200).json({
                        event_id: event_id,
                        decision: decision,
                        brief_id: null,
                        resolved_at: resolvedAt,
                    })];
            case 9:
                err_3 = _d.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_3 instanceof Error ? err_3.message : 'Unexpected error',
                    })];
            case 10: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
