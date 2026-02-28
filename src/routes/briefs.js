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
var crypto_1 = require("crypto");
var express_1 = require("express");
var audit_1 = require("../lib/audit");
var supabase_1 = require("../lib/supabase");
var router = (0, express_1.Router)();
var VALID_REJECTION_REASONS = new Set([
    'misclassified_event',
    'wrong_client_context',
    'outdated_rules',
    'tone_inappropriate',
    'other',
]);
function firstRelation(value) {
    var _a;
    if (!value)
        return null;
    return Array.isArray(value) ? ((_a = value[0]) !== null && _a !== void 0 ? _a : null) : value;
}
function parsePositiveInt(input, fallback) {
    var parsed = Number.parseInt(String(input !== null && input !== void 0 ? input : ''), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}
function sha256(input) {
    return (0, crypto_1.createHash)('sha256').update(input).digest('hex');
}
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status, limit, offset, _a, data, count, error, nowMs_1, briefs, err_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                status = String((_b = req.query.status) !== null && _b !== void 0 ? _b : 'pending');
                limit = parsePositiveInt(req.query.limit, 50);
                offset = parsePositiveInt(req.query.offset, 0);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .select('id, client_id, status, created_at, event_id, clients(name), life_events(event_type, source, confidence_score, risk_tier)', { count: 'exact' })
                        .eq('status', status)
                        .order('created_at', { ascending: true })
                        .range(offset, offset + limit - 1)];
            case 2:
                _a = _c.sent(), data = _a.data, count = _a.count, error = _a.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                nowMs_1 = Date.now();
                briefs = (data !== null && data !== void 0 ? data : []).map(function (row) {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                    var createdAt = new Date(row.created_at).toISOString();
                    var createdMs = new Date(row.created_at).getTime();
                    var timeInQueueMinutes = Math.max(0, Math.floor((nowMs_1 - createdMs) / 60000));
                    return {
                        brief_id: row.id,
                        client_id: row.client_id,
                        client_name: (_b = (_a = row.clients) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '',
                        event_type: (_d = (_c = row.life_events) === null || _c === void 0 ? void 0 : _c.event_type) !== null && _d !== void 0 ? _d : '',
                        confidence_score: Number((_f = (_e = row.life_events) === null || _e === void 0 ? void 0 : _e.confidence_score) !== null && _f !== void 0 ? _f : 0),
                        source: (_h = (_g = row.life_events) === null || _g === void 0 ? void 0 : _g.source) !== null && _h !== void 0 ? _h : '',
                        risk_tier: (_k = (_j = row.life_events) === null || _j === void 0 ? void 0 : _j.risk_tier) !== null && _k !== void 0 ? _k : '',
                        status: row.status,
                        created_at: createdAt,
                        time_in_queue_minutes: timeInQueueMinutes,
                    };
                });
                return [2 /*return*/, res.status(200).json({
                        briefs: briefs,
                        total: count !== null && count !== void 0 ? count : 0,
                        offset: offset,
                    })];
            case 3:
                err_1 = _c.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_1 instanceof Error ? err_1.message : 'Unexpected error',
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/:brief_id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var brief_id, _a, data, error, err_2;
    var _b, _c, _d, _e, _f, _g, _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                brief_id = req.params.brief_id;
                _k.label = 1;
            case 1:
                _k.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .select("id, status, created_at, content, client_id,\n         clients(client_id:id, name, age, province, income_bracket, accounts, tfsa_room, rrsp_room, dependents),\n         life_events(event_type, source, confidence_score, risk_tier)")
                        .eq('id', brief_id)
                        .single()];
            case 2:
                _a = _k.sent(), data = _a.data, error = _a.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                if (!data) {
                    return [2 /*return*/, res.status(404).json({ error: 'Brief not found' })];
                }
                return [2 /*return*/, res.status(200).json({
                        brief_id: data.id,
                        status: data.status,
                        event_type: (_c = (_b = firstRelation(data.life_events)) === null || _b === void 0 ? void 0 : _b.event_type) !== null && _c !== void 0 ? _c : '',
                        confidence_score: Number((_e = (_d = firstRelation(data.life_events)) === null || _d === void 0 ? void 0 : _d.confidence_score) !== null && _e !== void 0 ? _e : 0),
                        source: (_g = (_f = firstRelation(data.life_events)) === null || _f === void 0 ? void 0 : _f.source) !== null && _g !== void 0 ? _g : '',
                        risk_tier: (_j = (_h = firstRelation(data.life_events)) === null || _h === void 0 ? void 0 : _h.risk_tier) !== null && _j !== void 0 ? _j : '',
                        created_at: new Date(data.created_at).toISOString(),
                        client: data.clients,
                        content: data.content,
                    })];
            case 3:
                err_2 = _k.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_2 instanceof Error ? err_2.message : 'Unexpected error',
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.post('/:brief_id/approve', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var brief_id, _a, advisor_id, edited_content, _b, existingBrief, fetchError, originalHash, finalHash, wasEdited, approvedAt, updateError, headline, _c, notificationRecord, notificationError, err_3;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                brief_id = req.params.brief_id;
                _a = req.body, advisor_id = _a.advisor_id, edited_content = _a.edited_content;
                if (!advisor_id || !edited_content) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 8, , 9]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .select('id, client_id, original_content_hash')
                        .eq('id', brief_id)
                        .single()];
            case 2:
                _b = _e.sent(), existingBrief = _b.data, fetchError = _b.error;
                if (fetchError) {
                    return [2 /*return*/, res.status(500).json({ error: fetchError.message })];
                }
                if (!existingBrief) {
                    return [2 /*return*/, res.status(404).json({ error: 'Brief not found' })];
                }
                originalHash = (_d = existingBrief.original_content_hash) !== null && _d !== void 0 ? _d : '';
                finalHash = sha256(JSON.stringify(edited_content));
                wasEdited = originalHash !== finalHash;
                approvedAt = new Date().toISOString();
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .update({
                        status: 'approved',
                        content: edited_content,
                        final_content_hash: finalHash,
                        was_edited: wasEdited,
                        advisor_id: advisor_id,
                        approved_at: approvedAt,
                    })
                        .eq('id', brief_id)];
            case 3:
                updateError = (_e.sent()).error;
                if (updateError) {
                    return [2 /*return*/, res.status(500).json({ error: updateError.message })];
                }
                headline = "We noticed something. Here's what it means for your money.";
                return [4 /*yield*/, supabase_1.supabase
                        .from('notifications')
                        .insert({
                        brief_id: brief_id,
                        client_id: existingBrief.client_id,
                        headline: headline,
                        status: 'delivered',
                        delivered_at: approvedAt,
                    })
                        .select('id')
                        .single()];
            case 4:
                _c = _e.sent(), notificationRecord = _c.data, notificationError = _c.error;
                if (notificationError) {
                    return [2 /*return*/, res.status(500).json({ error: notificationError.message })];
                }
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_id: advisor_id,
                        actor_type: 'advisor',
                        action: 'brief_approved',
                        record_type: 'brief',
                        record_id: String(brief_id),
                        client_id: existingBrief.client_id,
                        metadata: {
                            advisor_id: advisor_id,
                            was_edited: wasEdited,
                            original_content_hash: originalHash,
                            final_content_hash: finalHash,
                        },
                    })];
            case 5:
                _e.sent();
                if (!(notificationRecord === null || notificationRecord === void 0 ? void 0 : notificationRecord.id)) return [3 /*break*/, 7];
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_type: 'system',
                        action: 'notification_sent',
                        record_type: 'notification',
                        record_id: notificationRecord.id,
                        client_id: existingBrief.client_id,
                        metadata: {
                            brief_id: String(brief_id),
                            client_id: existingBrief.client_id,
                            headline: headline,
                        },
                    })];
            case 6:
                _e.sent();
                _e.label = 7;
            case 7: return [2 /*return*/, res.status(200).json({
                    brief_id: brief_id,
                    status: 'approved',
                    approved_at: approvedAt,
                    notification_queued: true,
                })];
            case 8:
                err_3 = _e.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_3 instanceof Error ? err_3.message : 'Unexpected error',
                    })];
            case 9: return [2 /*return*/];
        }
    });
}); });
router.post('/:brief_id/reject', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var brief_id, _a, advisor_id, rejection_reason, rejectedAt, _b, updatedBrief, error, err_4;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                brief_id = req.params.brief_id;
                _a = req.body, advisor_id = _a.advisor_id, rejection_reason = _a.rejection_reason;
                if (!advisor_id ||
                    !rejection_reason ||
                    !VALID_REJECTION_REASONS.has(rejection_reason)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                rejectedAt = new Date().toISOString();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .update({
                        status: 'rejected',
                        rejection_reason: rejection_reason,
                        advisor_id: advisor_id,
                        rejected_at: rejectedAt,
                    })
                        .eq('id', brief_id)
                        .select('id, client_id')
                        .single()];
            case 2:
                _b = _c.sent(), updatedBrief = _b.data, error = _b.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                if (!updatedBrief) {
                    return [2 /*return*/, res.status(404).json({ error: 'Brief not found' })];
                }
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_id: advisor_id,
                        actor_type: 'advisor',
                        action: 'brief_rejected',
                        record_type: 'brief',
                        record_id: String(brief_id),
                        client_id: updatedBrief.client_id,
                        metadata: {
                            advisor_id: advisor_id,
                            rejection_reason: rejection_reason,
                        },
                    })];
            case 3:
                _c.sent();
                return [2 /*return*/, res.status(200).json({
                        brief_id: brief_id,
                        status: 'rejected',
                        rejected_at: rejectedAt,
                    })];
            case 4:
                err_4 = _c.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_4 instanceof Error ? err_4.message : 'Unexpected error',
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.post('/:brief_id/flag', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var brief_id, _a, advisor_id, flag_reason, flaggedAt, _b, updatedBrief, error, err_5;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                brief_id = req.params.brief_id;
                _a = req.body, advisor_id = _a.advisor_id, flag_reason = _a.flag_reason;
                if (!advisor_id || !flag_reason) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                flaggedAt = new Date().toISOString();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .update({
                        status: 'flagged',
                        flag_reason: flag_reason,
                        advisor_id: advisor_id,
                        flagged_at: flaggedAt,
                    })
                        .eq('id', brief_id)
                        .select('id, client_id')
                        .single()];
            case 2:
                _b = _c.sent(), updatedBrief = _b.data, error = _b.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                if (!updatedBrief) {
                    return [2 /*return*/, res.status(404).json({ error: 'Brief not found' })];
                }
                return [4 /*yield*/, (0, audit_1.logAudit)({
                        actor_id: advisor_id,
                        actor_type: 'advisor',
                        action: 'brief_flagged',
                        record_type: 'brief',
                        record_id: String(brief_id),
                        client_id: updatedBrief.client_id,
                        metadata: {
                            advisor_id: advisor_id,
                            flag_reason: flag_reason,
                        },
                    })];
            case 3:
                _c.sent();
                return [2 /*return*/, res.status(200).json({
                        brief_id: brief_id,
                        status: 'flagged',
                        flagged_at: flaggedAt,
                    })];
            case 4:
                err_5 = _c.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_5 instanceof Error ? err_5.message : 'Unexpected error',
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
