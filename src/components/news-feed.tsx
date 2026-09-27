import { ArrowLeftRight, Flag, Megaphone, Trophy } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { News } from "@/lib/types";
import { NewsActions, type NewsCommentView } from "./news-actions";

const kindMeta = {
  announcement: { icon: Megaphone, label: "Announcement" },
  transaction: { icon: ArrowLeftRight, label: "Transaction" },
  result: { icon: Trophy, label: "Final" },
  system: { icon: Flag, label: "League" },
} as const;

export type NewsSocial = {
  leagueId: string;
  meId: string;
  canModerate: boolean;
  likes: Map<string, { count: number; mine: boolean }>;
  comments: Map<string, NewsCommentView[]>;
};

export function NewsFeed({ items, social }: { items: News[]; social?: NewsSocial }) {
  return (
    <div className="card divide-y divide-line">
      {items.map((n) => {
        const meta = kindMeta[n.kind] ?? kindMeta.system;
        const Icon = meta.icon;
        const likes = social?.likes.get(n.id);
        return (
          <article key={n.id} className="flex gap-3 p-4">
            <span
              className={`w-8 h-8 shrink-0 rounded-lg inline-flex items-center justify-center ${
                n.kind === "announcement" ? "bg-brand text-bg" : "bg-surface-2 text-muted"
              }`}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                {meta.label} · {timeAgo(n.created_at)}
              </div>
              <h3 className="font-semibold mt-0.5 leading-snug">{n.title}</h3>
              {n.body && <p className="text-sm text-muted mt-1 whitespace-pre-line">{n.body}</p>}
              {social && (
                <NewsActions
                  newsId={n.id}
                  leagueId={social.leagueId}
                  meId={social.meId}
                  canModerate={social.canModerate}
                  likeCount={likes?.count ?? 0}
                  liked={likes?.mine ?? false}
                  comments={social.comments.get(n.id) ?? []}
                />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
