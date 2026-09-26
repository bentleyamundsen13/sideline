"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError } from "./form-error";
import { errorMessage } from "@/lib/format";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setCheckEmail(true);
        }
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="card p-6 text-center animate-fade-up">
        <p className="display text-2xl">Check your email</p>
        <p className="text-sm text-muted mt-2">
          We sent a confirmation link to <span className="text-text">{email}</span>. Tap it to finish creating your
          account.
        </p>
      </div>
    );
  }

  const other = mode === "login" ? "/signup" : "/login";
  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4 animate-fade-up">
      <div>
        <h1 className="display text-3xl">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted mt-1">
          {mode === "login" ? "Sign in to get back to your league." : "It takes ten seconds. Then join or start a league."}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <FormError error={error} />
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "One sec…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-sm text-muted text-center">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={`${other}${nextQuery}`} className="text-text font-semibold hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
