import type { LeagueContext } from "./league";
import type { News } from "./types";
import type { NewsSocial } from "@/components/news-feed";
import type { NewsCommentView } from "@/components/news-actions";

/** Likes and comments for a set of news posts, shaped for the feed. */
export async function loadNewsSocial(ctx: LeagueContext, news: News[]): Promise<NewsSocial> {
  const ids = news.map((n) => n.id);
  const [{ data: likeRows }, { data: commentRows }] = ids.length
    ? await Promise.all([
        ctx.supabase.from("news_likes").select("news_id, member_id").in("news_id", ids),
        ctx.supabase.from("news_comments").select("id, news_id, member_id, body, created_at").in("news_id", ids).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const likes = new Map<string, { count: number; mine: boolean }>();
  for (const l of (likeRows ?? []) as { news_id: string; member_id: string }[]) {
    const entry = likes.get(l.news_id) ?? { count: 0, mine: false };
    entry.count++;
    if (l.member_id === ctx.me.id) entry.mine = true;
    likes.set(l.news_id, entry);
  }

  const comments = new Map<string, NewsCommentView[]>();
  for (const c of (commentRows ?? []) as { id: string; news_id: string; member_id: string | null; body: string; created_at: string }[]) {
    const m = c.member_id ? ctx.memberById.get(c.member_id) : null;
    const team = m?.team_id ? ctx.teamById.get(m.team_id) : null;
    const list = comments.get(c.news_id) ?? [];
    list.push({
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      author: m ? { id: m.id, name: m.display_name, avatarUrl: m.avatar_url, color: team?.color ?? null } : null,
    });
    comments.set(c.news_id, list);
  }

  return { leagueId: ctx.league.id, meId: ctx.me.id, canModerate: ctx.isCommish, likes, comments };
}
