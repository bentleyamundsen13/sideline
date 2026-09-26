import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUser = { id: string; email: string | null };

/**
 * The signed-in user, from the verified session token. getClaims() checks the
 * token locally when the project uses asymmetric signing keys (no round trip to
 * Supabase Auth), and falls back to a server check otherwise, so it's never
 * slower than getUser().
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}
