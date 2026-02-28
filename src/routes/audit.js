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
var supabase_1 = require("../lib/supabase");
var router = (0, express_1.Router)();
function parsePositiveInt(input, fallback) {
    var parsed = Number.parseInt(String(input !== null && input !== void 0 ? input : ''), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return parsed;
}
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clientId, advisorId, eventType, from, to, limit, offset, query, _a, data, count, error, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                clientId = req.query.client_id;
                advisorId = req.query.advisor_id;
                eventType = req.query.event_type;
                from = req.query.from;
                to = req.query.to;
                limit = parsePositiveInt(req.query.limit, 50);
                offset = parsePositiveInt(req.query.offset, 0);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                query = supabase_1.supabase
                    .from('audit_log')
                    .select('id, actor_id, actor_type, action, record_type, record_id, client_id, metadata, timestamp', { count: 'exact' })
                    .order('timestamp', { ascending: false })
                    .range(offset, offset + limit - 1);
                if (typeof clientId === 'string' && clientId.length > 0) {
                    query = query.eq('client_id', clientId);
                }
                if (typeof advisorId === 'string' && advisorId.length > 0) {
                    query = query.eq('actor_id', advisorId);
                }
                if (typeof eventType === 'string' && eventType.length > 0) {
                    query = query.eq('metadata->>event_type', eventType);
                }
                if (typeof from === 'string' && from.length > 0) {
                    query = query.gte('timestamp', from);
                }
                if (typeof to === 'string' && to.length > 0) {
                    query = query.lte('timestamp', to);
                }
                return [4 /*yield*/, query];
            case 2:
                _a = _b.sent(), data = _a.data, count = _a.count, error = _a.error;
                if (error) {
                    return [2 /*return*/, res.status(500).json({ error: error.message })];
                }
                return [2 /*return*/, res.status(200).json({
                        entries: (data !== null && data !== void 0 ? data : []).map(function (row) {
                            var _a;
                            return ({
                                log_id: row.id,
                                actor_id: row.actor_id,
                                actor_type: row.actor_type,
                                action: row.action,
                                record_type: row.record_type,
                                record_id: row.record_id,
                                client_id: row.client_id,
                                metadata: (_a = row.metadata) !== null && _a !== void 0 ? _a : {},
                                timestamp: new Date(row.timestamp).toISOString(),
                            });
                        }),
                        total: count !== null && count !== void 0 ? count : 0,
                        offset: offset,
                    })];
            case 3:
                err_1 = _b.sent();
                return [2 /*return*/, res.status(500).json({
                        error: err_1 instanceof Error ? err_1.message : 'Unexpected error',
                    })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
