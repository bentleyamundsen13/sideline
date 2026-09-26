import { ArrowLeftRight, Flag, Megaphone, Trophy } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { News } from "@/lib/types";

const kindMeta = {
  announcement: { icon: Megaphone, label: "Announcement" },
  transaction: { icon: ArrowLeftRight, label: "Transaction" },
  result: { icon: Trophy, label: "Final" },
  system: { icon: Flag, label: "League" },
} as const;

export function NewsFeed({ items }: { items: News[] }) {
  return (
    <div className="card divide-y divide-line">
      {items.map((n) => {
        const meta = kindMeta[n.kind] ?? kindMeta.system;
        const Icon = meta.icon;
        return (
          <article key={n.id} className="flex gap-3 p-4">
            <span
              className={`w-8 h-8 shrink-0 rounded-lg inline-flex items-center justify-center ${
                n.kind === "announcement" ? "bg-brand text-bg" : "bg-surface-2 text-muted"
              }`}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {meta.label} · {timeAgo(n.created_at)}
              </div>
              <h3 className="font-semibold mt-0.5 leading-snug">{n.title}</h3>
              {n.body && <p className="text-sm text-muted mt-1 whitespace-pre-line">{n.body}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
