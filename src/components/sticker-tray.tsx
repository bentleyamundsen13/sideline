"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";
import type { Sticker } from "@/lib/types";
import { STICKERS_CHANGED } from "@/lib/stickers";
import { StickerMaker } from "./sticker-maker";

/** The league's stickers. Tap one to send it; make new ones from photos. */
export function StickerTray({
  leagueId,
  memberId,
  canModerate,
  onPick,
}: {
  leagueId: string;
  memberId: string;
  canModerate: boolean;
  onPick: (s: Sticker) => void;
}) {
  const [stickers, setStickers] = useState<Sticker[] | null>(null);
  const [making, setMaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      createClient()
        .from("stickers")
        .select("*")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) setError(errorMessage(error));
          setStickers((data ?? []) as Sticker[]);
        });
    load();
    // Stickers saved elsewhere (e.g. "Create sticker" on a photo) show up here right away.
    window.addEventListener(STICKERS_CHANGED, load);
    return () => window.removeEventListener(STICKERS_CHANGED, load);
  }, [leagueId]);

  async function remove(s: Sticker) {
    setStickers((list) => list?.filter((x) => x.id !== s.id) ?? null);
    const { error } = await createClient().from("stickers").delete().eq("id", s.id);
    if (error) setError(errorMessage(error));
  }

  const mine = (s: Sticker) => canModerate || s.member_id === memberId;

  return (
    <div className="border-t border-line bg-surface">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="section-title">Stickers</span>
        {stickers?.some(mine) && (
          <button className="text-xs font-semibold text-muted hover:text-text" onClick={() => setEditing((e) => !e)}>
            {editing ? "Done" : "Edit"}
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 max-h-56 overflow-y-auto">
        <button
          className="aspect-square rounded-2xl border-2 border-dashed border-line text-muted flex flex-col items-center justify-center gap-1 hover:text-text"
          onClick={() => setMaking(true)}
        >
          <Plus size={22} />
          <span className="text-[10px] font-semibold">New</span>
        </button>
        {stickers === null &&
          Array.from({ length: 3 }, (_, i) => <div key={i} className="aspect-square rounded-full bg-surface-2 animate-pulse" />)}
        {stickers?.map((s) => (
          <div key={s.id} className="relative">
            <button
              className="w-full aspect-square active:scale-90 transition-transform"
              onClick={() => !editing && onPick(s)}
              aria-label={`Send sticker: ${s.name}`}
              title={s.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image_url} alt={s.name} className="w-full h-full object-contain drop-shadow" loading="lazy" />
            </button>
            {editing && mine(s) && (
              <button
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-danger text-white inline-flex items-center justify-center shadow"
                onClick={() => remove(s)}
                aria-label={`Delete sticker ${s.name}`}
              >
                <X size={13} strokeWidth={3} />
              </button>
            )}
          </div>
        ))}
      </div>
      {stickers?.length === 0 && <p className="text-xs text-muted px-4 pb-3 -mt-1">No stickers yet. Make the first one from a photo.</p>}
      {error && <p className="text-xs text-danger px-4 pb-3">{error}</p>}
      {making && (
        <StickerMaker
          leagueId={leagueId}
          memberId={memberId}
          onClose={() => setMaking(false)}
          // Saving fires STICKERS_CHANGED, which reloads the tray.
          onSaved={() => setMaking(false)}
        />
      )}
    </div>
  );
}
