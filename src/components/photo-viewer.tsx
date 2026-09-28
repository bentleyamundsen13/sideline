"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Scissors, X } from "lucide-react";
import { makeCutoutSticker, warmUpCutout } from "@/lib/cutout";
import { saveSticker, TRANSPARENT_BG } from "@/lib/stickers";
import { errorMessage } from "@/lib/format";

type Phase =
  | { kind: "photo" }
  | { kind: "working" }
  | { kind: "preview"; canvas: HTMLCanvasElement; url: string }
  | { kind: "saved" }
  | { kind: "none" };

/**
 * Full-screen photo from chat, with Snapchat-style "Create sticker": cuts the
 * person out and saves them to the league's stickers.
 */
export function PhotoViewer({
  src,
  leagueId,
  memberId,
  onClose,
}: {
  src: string;
  leagueId: string;
  memberId: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "photo" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Start loading the cutout engine now so the button feels instant.
  useEffect(() => warmUpCutout(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function createSticker() {
    setError(null);
    setPhase({ kind: "working" });
    try {
      const photo = await (await fetch(src)).blob();
      const canvas = await makeCutoutSticker(photo);
      setPhase(canvas ? { kind: "preview", canvas, url: canvas.toDataURL() } : { kind: "none" });
    } catch (e) {
      setError(errorMessage(e));
      setPhase({ kind: "photo" });
    }
  }

  async function save(canvas: HTMLCanvasElement) {
    setSaving(true);
    setError(null);
    try {
      await saveSticker(leagueId, memberId, canvas);
      setPhase({ kind: "saved" });
      setTimeout(onClose, 900);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] bg-black/95 flex flex-col animate-fade-up" role="dialog" aria-modal="true" aria-label="Photo">
      <div className="flex justify-end px-3" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/15 text-white inline-flex items-center justify-center" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4" onClick={phase.kind === "photo" ? onClose : undefined}>
        {phase.kind === "preview" || phase.kind === "saved" ? (
          <div className="rounded-3xl p-6 flex items-center justify-center max-h-full" style={{ background: TRANSPARENT_BG }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={phase.kind === "preview" ? phase.url : undefined} alt="Your sticker" className="max-h-[55vh] max-w-full drop-shadow-2xl" hidden={phase.kind === "saved"} />
            {phase.kind === "saved" && (
              <div className="flex flex-col items-center gap-2 text-white p-10">
                <Check size={40} className="text-brand" />
                <span className="font-semibold">Saved to stickers</span>
              </div>
            )}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Photo"
            onClick={(e) => e.stopPropagation()}
            className={`max-w-full max-h-full object-contain rounded-lg transition-opacity ${phase.kind === "working" ? "opacity-40" : ""}`}
          />
        )}
      </div>

      <div className="px-4 pt-2 flex flex-col items-center gap-2" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}>
        {error && <p className="text-sm text-rose-300 text-center">{error}</p>}
        {phase.kind === "photo" && (
          <button onClick={createSticker} className="btn bg-white text-black !py-3 !px-6 !rounded-full">
            <Scissors size={18} /> Create sticker
          </button>
        )}
        {phase.kind === "working" && (
          <p className="text-white/80 text-sm font-semibold inline-flex items-center gap-2 py-3">
            <Scissors size={16} className="animate-pulse" /> Cutting them out…
          </p>
        )}
        {phase.kind === "none" && (
          <>
            <p className="text-white/80 text-sm text-center">Couldn&apos;t find a person in this photo.</p>
            <button onClick={() => setPhase({ kind: "photo" })} className="btn bg-white/15 text-white !rounded-full">
              Back to photo
            </button>
          </>
        )}
        {phase.kind === "preview" && (
          <div className="flex gap-2 w-full max-w-sm">
            <button onClick={() => setPhase({ kind: "photo" })} className="btn bg-white/15 text-white flex-1 !rounded-full" disabled={saving}>
              Cancel
            </button>
            <button onClick={() => save(phase.canvas)} className="btn bg-white text-black flex-1 !rounded-full" disabled={saving}>
              {saving ? "Saving…" : "Save sticker"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
