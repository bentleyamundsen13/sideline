"use client";

import { createClient } from "./supabase/client";

/** Shrinks a photo so its longest side is at most `max` px, as WebP. Keeps chat fast on phones. */
export async function shrinkPhoto(file: File, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return toWebp(canvas, 0.82);
}

export function toWebp(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that image"))), "image/webp", quality),
  );
}

/** Uploads to the league's chat-media folder and returns the public URL. */
export async function uploadChatMedia(leagueId: string, blob: Blob, kind: "photos" | "stickers") {
  const supabase = createClient();
  const path = `${leagueId}/${kind}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("chat-media").upload(path, blob, { contentType: "image/webp" });
  if (error) throw error;
  return supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl;
}
