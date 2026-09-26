// Resolved from whichever Supabase env var names exist; see next.config.ts.
export const SUPABASE_URL = process.env.SIDELINE_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.SIDELINE_SUPABASE_KEY ?? "";
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);
