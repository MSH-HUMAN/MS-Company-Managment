import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "documents";

// Lazy initialization — created only when first used (not at build time)
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      `Supabase configuration missing. NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl ? "set" : "MISSING"}, SUPABASE_SERVICE_KEY=${supabaseServiceKey ? "set" : "MISSING"}`
    );
  }

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}
