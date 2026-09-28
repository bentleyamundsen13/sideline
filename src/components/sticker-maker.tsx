"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Scissors, X } from "lucide-react";
import { makeCutoutSticker, warmUpCutout } from "@/lib/cutout";
import { saveSticker, TRANSPARENT_BG } from "@/lib/stickers";
import { errorMessage } from "@/lib/format";
import type { Sticker } from "@/lib/types";

const FRAME = 260; // on-screen circle crop, px
const OUT = 512; // saved circle sticker size, px
const BORDER = 20; // white edge on circle stickers, px

type Step =
  | { kind: "pick" }
  | { kind: "working" }
  | { kind: "preview"; canvas: HTMLCanvasElement; url: string }
  | { kind: "circle"; img: HTMLImageElement; reason?: string };

/**
 * New sticker from your camera roll: cuts the person out of the photo (like
 * Snapchat). If there's nobody in it, falls back to a round crop.
 */
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
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    warmUpCutout();
    fileRef.current?.click();
  }, []);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setStep({ kind: "working" });
    try {
      const canvas = await makeCutoutSticker(file);
      if (canvas) {
        setStep({ kind: "preview", canvas, url: canvas.toDataURL() });
        return;
      }
      setStep({ kind: "circle", img: await loadImage(file), reason: "Couldn't find a person in that photo, so crop a circle instead." });
    } catch (err) {
      // Engine didn't load (offline?): the circle crop still works.
      setError(errorMessage(err));
      setStep({ kind: "circle", img: await loadImage(file) });
    }
  }

  async function save(canvas: HTMLCanvasElement) {
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveSticker(leagueId, memberId, canvas));
    } catch (err) {
      setError(errorMessage(err));
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

        {step.kind === "pick" && (
          <button className="card mt-8 p-10 flex flex-col items-center gap-3 text-muted" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={32} />
            <span className="font-semibold text-text">Pick a photo</span>
            <span className="text-sm text-center">The person gets cut out of the background automatically.</span>
          </button>
        )}

        {step.kind === "working" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted">
            <Scissors size={32} className="animate-pulse text-brand" />
            <p className="font-semibold text-text">Cutting them out…</p>
            <p className="text-xs">The first one takes a few extra seconds.</p>
          </div>
        )}

        {step.kind === "preview" && (
          <>
            <div className="mt-6 rounded-3xl p-6 flex items-center justify-center" style={{ background: TRANSPARENT_BG }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.url} alt="Your sticker" className="max-h-72 max-w-full drop-shadow-xl" />
            </div>
            {error && <p className="text-sm text-danger mt-3">{error}</p>}
            <button className="btn btn-primary w-full mt-6 !py-3.5" disabled={saving} onClick={() => save(step.canvas)}>
              {saving ? "Saving…" : "Save sticker"}
            </button>
            <button className="text-sm text-muted font-semibold mt-3 self-center" onClick={() => fileRef.current?.click()}>
              Try a different photo
            </button>
            <p className="text-xs text-muted text-center mt-2">Everyone in the league can use it.</p>
          </>
        )}

        {step.kind === "circle" && (
          <CircleCrop img={step.img} note={step.reason ?? error} saving={saving} onSave={save} onRepick={() => fileRef.current?.click()} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function loadImage(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Couldn't open that photo"));
    el.src = URL.createObjectURL(file);
  });
}

/** Fallback: drag and zoom the photo into a white-edged circle. */
function CircleCrop({
  img,
  note,
  saving,
  onSave,
  onRepick,
}: {
  img: HTMLImageElement;
  note?: string | null;
  saving: boolean;
  onSave: (c: HTMLCanvasElement) => void;
  onRepick: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const scale = (FRAME / Math.min(img.naturalWidth, img.naturalHeight)) * zoom;

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

  function render() {
    const k = OUT / FRAME;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    const r = OUT / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r - BORDER / 2, 0, Math.PI * 2);
    ctx.clip();
    const w = img.naturalWidth * scale * k;
    const h = img.naturalHeight * scale * k;
    ctx.drawImage(img, r + pos.x * k - w / 2, r + pos.y * k - h / 2, w, h);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(r, r, r - BORDER / 2, 0, Math.PI * 2);
    ctx.lineWidth = BORDER;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    onSave(canvas);
  }

  return (
    <>
      <p className="text-sm text-muted mt-2">{note ?? "Drag to move. Pinch or use the slider to zoom."}</p>
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
      <button className="btn btn-primary w-full mt-6 !py-3.5" disabled={saving} onClick={render}>
        {saving ? "Saving…" : "Save sticker"}
      </button>
      <button className="text-sm text-muted font-semibold mt-3 self-center" onClick={onRepick}>
        Choose a different photo
      </button>
    </>
  );
}
