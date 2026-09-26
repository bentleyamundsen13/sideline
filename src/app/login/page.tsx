import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/ui";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Wordmark />
      </Link>
      <div className="w-full max-w-sm">
        <AuthForm mode="login" next={safeNext(next)} />
      </div>
    </main>
  );
}
