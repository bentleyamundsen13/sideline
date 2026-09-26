import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
      <p className="display text-8xl text-muted">404</p>
      <h1 className="display text-3xl mt-2">Out of bounds</h1>
      <p className="text-muted text-sm mt-2">That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to your leagues
      </Link>
    </main>
  );
}
