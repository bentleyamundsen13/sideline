"use client";

import { createClient } from "./supabase/client";
import { toWebp, uploadChatMedia } from "./chat-media";
import type { Sticker } from "./types";

/** Saves a finished sticker image to the league's sticker collection. */
export async function saveSticker(leagueId: string, memberId: string, image: HTMLCanvasElement, name = "Sticker"): Promise<Sticker> {
  const url = await uploadChatMedia(leagueId, await toWebp(image), "stickers");
  const { data, error } = await createClient()
    .from("stickers")
    .insert({ league_id: leagueId, member_id: memberId, name: name.trim() || "Sticker", image_url: url })
    .select()
    .single();
  if (error) throw error;
  window.dispatchEvent(new Event(STICKERS_CHANGED));
  return data as Sticker;
}

/** Fired after a sticker is saved anywhere, so an open tray can reload. */
export const STICKERS_CHANGED = "sideline:stickers-changed";

/** Checkerboard behind transparent images, so you can see what was cut out. */
export const TRANSPARENT_BG = "repeating-conic-gradient(#2a2f3a 0 25%, #1c2029 0 50%) 0 0 / 16px 16px";
