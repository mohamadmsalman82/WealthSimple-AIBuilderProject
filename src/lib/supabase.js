"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
}
if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
