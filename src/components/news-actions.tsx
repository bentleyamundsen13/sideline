"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { must, useAction } from "@/lib/use-action";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./ui";

export type NewsCommentView = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null; color: string | null } | null;
};

/** Like + comment bar under a news post. Likes update instantly; comments open inline. */
export function NewsActions({
  newsId,
  leagueId,
  meId,
  canModerate,
  likeCount,
  liked,
  comments,
}: {
  newsId: string;
  leagueId: string;
  meId: string;
  canModerate: boolean;
  likeCount: number;
  liked: boolean;
  comments: NewsCommentView[];
}) {
  const likeAction = useAction();
  const commentAction = useAction();
  const [isLiked, setIsLiked] = useState(liked);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // Shift the server's count by however your tap differs from what it knows.
  const count = likeCount - (liked ? 1 : 0) + (isLiked ? 1 : 0);

  function toggleLike() {
    const next = !isLiked;
    setIsLiked(next);
    likeAction
      .run(() => {
        const q = createClient().from("news_likes");
        return must(
          next
            ? q.insert({ news_id: newsId, member_id: meId, league_id: leagueId })
            : q.delete().eq("news_id", newsId).eq("member_id", meId),
        );
      })
      .then((ok) => {
        if (ok === undefined) setIsLiked(!next);
      });
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const ok = await commentAction.run(async () => {
      await must(createClient().from("news_comments").insert({ news_id: newsId, member_id: meId, league_id: leagueId, body }));
      return true;
    });
    if (ok) setDraft("");
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1 -ml-2">
        <button
          onClick={toggleLike}
          aria-pressed={isLiked}
          aria-label={isLiked ? "Unlike" : "Like"}
          className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-semibold transition-colors ${
            isLiked ? "text-rose-400" : "text-muted hover:text-text"
          }`}
        >
          <Heart size={17} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "animate-[splash-pop_300ms_ease-out]" : ""} />
          {count > 0 && <span className="tabular">{count}</span>}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Comments"
          className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm font-semibold transition-colors ${
            open ? "text-text" : "text-muted hover:text-text"
          }`}
        >
          <MessageCircle size={17} />
          {comments.length > 0 && <span className="tabular">{comments.length}</span>}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2.5 animate-fade-up">
          {comments.map((c) => (
            <Comment key={c.id} c={c} canDelete={canModerate || c.author?.id === meId} />
          ))}
          <form onSubmit={addComment} className="flex items-center gap-2">
            <input
              className="input !py-2 !rounded-full !text-[15px]"
              placeholder="Add a comment"
              aria-label="Add a comment"
              maxLength={500}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              className="w-9 h-9 shrink-0 rounded-full bg-text text-bg inline-flex items-center justify-center disabled:opacity-30"
              disabled={!draft.trim() || commentAction.pending}
              aria-label="Post comment"
            >
              <Send size={15} />
            </button>
          </form>
          {commentAction.error && <p className="text-xs text-danger">{commentAction.error}</p>}
        </div>
      )}
      {likeAction.error && <p className="text-xs text-danger mt-1">{likeAction.error}</p>}
    </div>
  );
}

function Comment({ c, canDelete }: { c: NewsCommentView; canDelete: boolean }) {
  const { run, pending } = useAction();
  return (
    <div className="flex gap-2.5">
      <Avatar member={{ display_name: c.author?.name ?? "?", avatar_url: c.author?.avatarUrl ?? null }} color={c.author?.color} size="xs" />
      <div className="flex-1 min-w-0 rounded-2xl bg-surface-2 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold truncate">{c.author?.name ?? "Former player"}</span>
          <span className="text-[10px] text-muted shrink-0">{timeAgo(c.createdAt)}</span>
          {canDelete && (
            <button
              className="ml-auto text-muted hover:text-text disabled:opacity-40"
              aria-label="Delete comment"
              disabled={pending}
              onClick={() => run(() => must(createClient().from("news_comments").delete().eq("id", c.id)))}
            >
              <X size={13} />
            </button>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
      </div>
    </div>
  );
}
