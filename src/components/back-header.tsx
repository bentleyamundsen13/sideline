import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackHeader({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text -ml-1">
      <ChevronLeft size={18} /> {label}
    </Link>
  );
}
