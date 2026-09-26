import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/ui";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 pt-safe pb-10">
      <Link href="/" className="mb-8">
        <Wordmark />
      </Link>
      <div className="w-full max-w-sm">
        <AuthForm mode="signup" next={safeNext(next)} />
      </div>
    </main>
  );
}
