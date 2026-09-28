"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toWebp, uploadChatMedia } from "@/lib/chat-media";
import { errorMessage } from "@/lib/format";
import type { Sticker } from "@/lib/types";

const FRAME = 260; // on-screen crop circle, px
const OUT = 512; // saved sticker size, px
const BORDER = 20; // white sticker edge in the saved image, px

/** Make a round sticker from a photo: drag to position, zoom, name it, save it for the league. */
export function StickerMaker({
  leagueId,
  memberId,
  onClose,
  onSaved,
}: {
  leagueId: string;
  memberId: string;
  onClose: () => void;
  onSaved: (s: Sticker) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    fileRef.current?.click();
  }, []);

  // Photo scaled so it just covers the circle at zoom 1.
  const cover = img ? FRAME / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = cover * zoom;

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setZoom(1);
      setPos({ x: 0, y: 0 });
    };
    el.src = url;
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) drag.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setZoom(Math.min(4, Math.max(1, (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist)));
    } else if (drag.current) {
      setPos({ x: drag.current.x + e.clientX - drag.current.px, y: drag.current.y + e.clientY - drag.current.py });
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  async function save() {
    if (!img || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const k = OUT / FRAME;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = OUT;
      const ctx = canvas.getContext("2d")!;
      const r = OUT / 2;
      // Photo, clipped to the circle.
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - BORDER / 2, 0, Math.PI * 2);
      ctx.clip();
      const w = img.naturalWidth * scale * k;
      const h = img.naturalHeight * scale * k;
      ctx.drawImage(img, r + pos.x * k - w / 2, r + pos.y * k - h / 2, w, h);
      ctx.restore();
      // White sticker edge.
      ctx.beginPath();
      ctx.arc(r, r, r - BORDER / 2, 0, Math.PI * 2);
      ctx.lineWidth = BORDER;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      const url = await uploadChatMedia(leagueId, await toWebp(canvas), "stickers");
      const { data, error } = await createClient()
        .from("stickers")
        .insert({ league_id: leagueId, member_id: memberId, name: name.trim(), image_url: url })
        .select()
        .single();
      if (error) throw error;
      onSaved(data as Sticker);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-bg/95 backdrop-blur-sm flex flex-col animate-fade-up" role="dialog" aria-modal="true" aria-label="New sticker">
      <div className="mx-auto w-full max-w-md px-4 pt-safe pb-safe flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="display text-3xl">New sticker</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />

        {!img ? (
          <button className="card mt-8 p-10 flex flex-col items-center gap-3 text-muted" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={32} />
            <span className="font-semibold text-text">Pick a photo</span>
            <span className="text-sm">Like a friend&apos;s face. You&apos;ll crop it into a circle.</span>
          </button>
        ) : (
          <>
            <p className="text-sm text-muted mt-2">Drag to move. Pinch or use the slider to zoom.</p>
            <div
              className="relative mx-auto mt-5 rounded-full overflow-hidden touch-none select-none ring-[10px] ring-white bg-surface-2 cursor-grab active:cursor-grabbing"
              style={{ width: FRAME, height: FRAME }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
                style={{
                  width: img.naturalWidth * scale,
                  height: img.naturalHeight * scale,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
              />
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="mt-7 w-full accent-[var(--brand)]"
            />
            <button className="text-sm text-muted font-semibold mt-3 self-center" onClick={() => fileRef.current?.click()}>
              Choose a different photo
            </button>

            <label className="label mt-6" htmlFor="sticker-name">
              Name
            </label>
            <input
              id="sticker-name"
              className="input"
              maxLength={30}
              placeholder="Chris hype face"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-sm text-danger mt-3">{error}</p>}
            <button className="btn btn-primary w-full mt-5 !py-3.5" disabled={saving || !name.trim()} onClick={save}>
              {saving ? "Saving…" : "Save sticker"}
            </button>
            <p className="text-xs text-muted text-center mt-2">Everyone in the league can use it.</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
