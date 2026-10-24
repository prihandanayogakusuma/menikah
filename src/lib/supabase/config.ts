export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Mendukung publishable key (sb_publishable_...) maupun anon key lama (eyJ...)
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20 && !SUPABASE_URL.includes("xxxxxxxx");
