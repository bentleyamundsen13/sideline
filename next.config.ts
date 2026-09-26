import type { NextConfig } from "next";

/**
 * Supabase settings can arrive under different names: set by hand
 * (NEXT_PUBLIC_SUPABASE_URL), by the Vercel integration (SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY), or with a custom integration prefix
 * (e.g. STORAGE_SUPABASE_URL). Pick whichever exists and inline it at build
 * time so both the server and the browser get it.
 */
function findEnv(suffixes: string[]) {
  const keys = Object.keys(process.env);
  for (const suffix of suffixes) {
    const exact = ["NEXT_PUBLIC_" + suffix, suffix].find((k) => process.env[k]);
    if (exact) return process.env[exact];
    const prefixed = keys.find((k) => k.endsWith("_" + suffix) && process.env[k]);
    if (prefixed) return process.env[prefixed];
  }
  return "";
}

const nextConfig: NextConfig = {
  env: {
    SIDELINE_SUPABASE_URL: findEnv(["SUPABASE_URL"]),
    SIDELINE_SUPABASE_KEY: findEnv(["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"]),
  },
};

export default nextConfig;
