'use strict';

const SUPABASE_URL = 'https://rigqcgptgbvzyekrgjnl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_x_uo5lxbHFkq3XonYDsX5w_iRA0uYok';

window.supabaseClient = window.createSupabaseLiteClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
