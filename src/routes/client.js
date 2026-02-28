"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var supabase_1 = require("../lib/supabase");
var router = (0, express_1.Router)();
var VALID_CLIENT_ACTIONS = new Set(['done', 'saved', 'dismissed']);
router.get('/briefs/:brief_id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var brief_id, clientId, _a, brief, briefError, _b, eventRecord, eventError, _c, notification, notificationError, openedNotification, openedAt, _d, updatedNotification, updateError, actionStates_1, content, actions, err_1;
    var _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                brief_id = req.params.brief_id;
                clientId = req.query.client_id;
                if (typeof clientId !== 'string' || clientId.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'client_id query param is required' })];
                }
                _h.label = 1;
            case 1:
                _h.trys.push([1, 7, , 8]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .select('id, client_id, event_id, content, created_at')
                        .eq('id', brief_id)
                        .single()];
            case 2:
                _a = _h.sent(), brief = _a.data, briefError = _a.error;
                if (briefError) {
                    return [2 /*return*/, res.status(500).json({ error: briefError.message })];
                }
                if (!brief) {
                    return [2 /*return*/, res.status(404).json({ error: 'Brief not found' })];
                }
                if (brief.client_id !== clientId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Forbidden' })];
                }
                return [4 /*yield*/, supabase_1.supabase
                        .from('life_events')
                        .select('event_type, created_at')
                        .eq('id', brief.event_id)
                        .single()];
            case 3:
                _b = _h.sent(), eventRecord = _b.data, eventError = _b.error;
                if (eventError) {
                    return [2 /*return*/, res.status(500).json({ error: eventError.message })];
                }
                return [4 /*yield*/, supabase_1.supabase
                        .from('notifications')
                        .select('id, delivered_at, status, action_states')
                        .eq('brief_id', brief_id)
                        .eq('client_id', clientId)
                        .order('delivered_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()];
            case 4:
                _c = _h.sent(), notification = _c.data, notificationError = _c.error;
                if (notificationError) {
                    return [2 /*return*/, res.status(500).json({ error: notificationError.message })];
                }
                openedNotification = notification;
                if (!(notification && notification.status === 'delivered')) return [3 /*break*/, 6];
                openedAt = new Date().toISOString();
                return [4 /*yield*/, supabase_1.supabase
                        .from('notifications')
                        .update({
                        status: 'opened',
                        opened_at: openedAt,
                    })
                        .eq('id', notification.id)
                        .select('id, delivered_at, status, action_states')
                        .single()];
            case 5:
                _d = _h.sent(), updatedNotification = _d.data, updateError = _d.error;
                if (updateError) {
                    return [2 /*return*/, res.status(500).json({ error: updateError.message })];
                }
                openedNotification = updatedNotification;
                _h.label = 6;
            case 6:
                actionStates_1 = ((_e = openedNotification === null || openedNotification === void 0 ? void 0 : openedNotification.action_states) !== null && _e !== void 0 ? _e : {});
                content = ((_f = brief.content) !== null && _f !== void 0 ? _f : {});
                actions = Array.isArray(content.actions) ? content.actions : [];
                return [2 /*return*/, res.status(200).json({
                        brief_id: brief_id,
                        event_type: (_g = eventRecord === null || eventRecord === void 0 ? void 0 : eventRecord.event_type) !== null && _g !== void 0 ? _g : '',
                        event_context: (eventRecord === null || eventRecord === void 0 ? void 0 : eventRecord.created_at)
                            ? "Detected on ".concat(new Date(eventRecord.created_at).toISOString())
                            : '',
                        content: __assign(__assign({}, content), { actions: actions.map(function (action) {
                                var _a;
                                return (__assign(__assign({}, action), { client_action: (_a = actionStates_1[String(action.rank)]) !== null && _a !== void 0 ? _a : null }));
                            }) }),
                        delivered_at: (openedNotification === null || openedNotification === void 0 ? void 0 : openedNotification.delivered_at)
                            ? new Date(openedNotification.delivered_at).toISOString()
                            : new Date(brief.created_at).toISOString(),
                    })];
            case 7:
                err_1 = _h.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_1 instanceof Error ? err_1.message : 'Unexpected error',
                    })];
            case 8: return [2 /*return*/];
        }
    });
}); });
router.post('/briefs/:brief_id/actions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var brief_id, _a, client_id, action_rank, client_action, _b, brief, briefError, _c, notification, notificationError, nextActionStates, updatedAt, updateError, err_2;
    var _d;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                brief_id = req.params.brief_id;
                _a = req.body, client_id = _a.client_id, action_rank = _a.action_rank, client_action = _a.client_action;
                if (!client_id ||
                    typeof action_rank !== 'number' ||
                    !Number.isInteger(action_rank) ||
                    action_rank < 1 ||
                    action_rank > 3 ||
                    !client_action ||
                    !VALID_CLIENT_ACTIONS.has(client_action)) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid request payload' })];
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 5, , 6]);
                return [4 /*yield*/, supabase_1.supabase
                        .from('briefs')
                        .select('id, client_id')
                        .eq('id', brief_id)
                        .single()];
            case 2:
                _b = _f.sent(), brief = _b.data, briefError = _b.error;
                if (briefError) {
                    return [2 /*return*/, res.status(500).json({ error: briefError.message })];
                }
                if (!brief) {
                    return [2 /*return*/, res.status(404).json({ error: 'Brief not found' })];
                }
                if (brief.client_id !== client_id) {
                    return [2 /*return*/, res.status(403).json({ error: 'Forbidden' })];
                }
                return [4 /*yield*/, supabase_1.supabase
                        .from('notifications')
                        .select('id, action_states')
                        .eq('brief_id', brief_id)
                        .eq('client_id', client_id)
                        .order('delivered_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()];
            case 3:
                _c = _f.sent(), notification = _c.data, notificationError = _c.error;
                if (notificationError) {
                    return [2 /*return*/, res.status(500).json({ error: notificationError.message })];
                }
                if (!notification) {
                    return [2 /*return*/, res.status(404).json({ error: 'Notification not found for brief' })];
                }
                nextActionStates = __assign(__assign({}, ((_e = notification.action_states) !== null && _e !== void 0 ? _e : {})), (_d = {}, _d[String(action_rank)] = client_action, _d));
                updatedAt = new Date().toISOString();
                return [4 /*yield*/, supabase_1.supabase
                        .from('notifications')
                        .update({
                        action_states: nextActionStates,
                    })
                        .eq('id', notification.id)];
            case 4:
                updateError = (_f.sent()).error;
                if (updateError) {
                    return [2 /*return*/, res.status(500).json({ error: updateError.message })];
                }
                return [2 /*return*/, res.status(200).json({
                        brief_id: brief_id,
                        action_rank: action_rank,
                        client_action: client_action,
                        updated_at: updatedAt,
                    })];
            case 5:
                err_2 = _f.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_2 instanceof Error ? err_2.message : 'Unexpected error',
                    })];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
