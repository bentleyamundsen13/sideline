"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { errorMessage } from "./format";

/**
 * Runs an async mutation, tracks pending/error state, and refreshes server data
 * afterwards so every screen reflects the change.
 */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(fn: () => Promise<T>, opts: { refresh?: boolean } = {}): Promise<T | undefined> => {
      setBusy(true);
      setError(null);
      try {
        const result = await fn();
        if (opts.refresh !== false) startTransition(() => router.refresh());
        return result;
      } catch (e) {
        setError(errorMessage(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { run, pending: busy || refreshing, error, setError };
}

/** Supabase returns `{ data, error }`; turn the error into a throw. */
export async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}
