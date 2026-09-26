"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markChatSeen } from "@/lib/chat-seen";
import { errorMessage, textOn } from "@/lib/format";
import type { TeamMessage } from "@/lib/types";
import { Avatar } from "./ui";

type ChatMember = { id: string; display_name: string; avatar_url: string | null };

export function TeamChat({
  leagueId,
  teamId,
  teamColor,
  meId,
  members,
  initial,
}: {
  leagueId: string;
  teamId: string;
  teamColor: string;
  meId: string;
  members: ChatMember[];
  initial: TeamMessage[];
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyboard = useKeyboardHeight();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const memberById = new Map(members.map((m) => [m.id, m]));

  // Live messages from teammates.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`team-chat:${teamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` }, (p) => {
        const m = p.new as TeamMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Everything on screen counts as read.
  useEffect(() => {
    markChatSeen(teamId);
  }, [teamId, messages.length]);

  useEffect(() => {
    const onScroll = () => {
      nearBottom.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Start at the newest message; follow new ones if you're already at the bottom.
  useLayoutEffect(() => {
    // Scroll the page itself to the end so the newest message clears the message box and tab bar.
    if (nearBottom.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages.length, keyboard]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data, error } = await createClient()
        .from("team_messages")
        .insert({ league_id: leagueId, team_id: teamId, member_id: meId, body })
        .select()
        .single();
      if (error) throw error;
      nearBottom.current = true;
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as TeamMessage]));
      setDraft("");
      inputRef.current?.focus();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const bubbleText = textOn(teamColor);

  return (
    <>
      <div className="space-y-1 pb-28">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted">
            <p className="font-semibold text-text">No messages yet</p>
            <p className="text-sm mt-1">Say something to your team. Only teammates can see this chat.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const mine = m.member_id === meId;
          const author = m.member_id ? memberById.get(m.member_id) : null;
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          const gap = (a: TeamMessage, b: TeamMessage) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() > 5 * 60_000;
          const firstInGroup = newDay || !prev || prev.member_id !== m.member_id || gap(prev, m);
          const lastInGroup = !next || next.member_id !== m.member_id || gap(m, next) || dayKey(next.created_at) !== dayKey(m.created_at);

          return (
            <div key={m.id}>
              {newDay && <div className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted py-4">{dayLabel(m.created_at)}</div>}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${firstInGroup && !newDay ? "mt-3" : ""}`}>
                {!mine && (
                  <div className="w-7 shrink-0">
                    {lastInGroup && <Avatar member={author ?? { display_name: "?", avatar_url: null }} color={teamColor} size="xs" />}
                  </div>
                )}
                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {firstInGroup && !mine && <span className="text-[11px] text-muted ml-3 mb-0.5">{author?.display_name ?? "Former teammate"}</span>}
                  <div
                    className={`px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words rounded-2xl ${
                      mine ? (lastInGroup ? "rounded-br-md" : "") : lastInGroup ? "rounded-bl-md" : ""
                    } ${mine ? "" : "bg-surface-2 border border-line"}`}
                    style={mine ? { background: teamColor, color: bubbleText } : undefined}
                  >
                    {m.body}
                  </div>
                  {lastInGroup && <span className={`text-[10px] text-muted mt-1 ${mine ? "mr-2" : "ml-3"}`}>{timeLabel(m.created_at)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="chat-composer fixed inset-x-0 z-30 bg-bg border-t border-line"
        style={{ bottom: keyboard > 0 ? keyboard : "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        {error && <p className="text-xs text-danger px-4 pt-2 mx-auto max-w-3xl">{error}</p>}
        <div className="mx-auto max-w-3xl flex items-end gap-2 px-3 py-2.5">
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={1000}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              // Enter sends on a keyboard; Shift+Enter for a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message your team"
            aria-label="Message your team"
            className="input !rounded-3xl !py-2.5 resize-none max-h-[120px] leading-snug"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="w-11 h-11 shrink-0 rounded-full inline-flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ background: teamColor, color: bubbleText }}
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </>
  );
}

/**
 * iOS keeps fixed elements pinned behind the on-screen keyboard. Measure how
 * much of the screen the keyboard covers so the message box can sit on top of
 * it, and hide the tab bar while typing.
 */
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const h = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      const open = h > 80;
      setHeight(open ? h : 0);
      document.documentElement.toggleAttribute("data-keyboard-open", open);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.removeAttribute("data-keyboard-open");
    };
  }, []);
  return height;
}

const dayKey = (iso: string) => new Date(iso).toDateString();

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
