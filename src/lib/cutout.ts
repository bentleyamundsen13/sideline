"use client";

import type { ImageSegmenter } from "@mediapipe/tasks-vision";

/**
 * Snapchat-style sticker cutouts: find the person in a photo, drop the
 * background, trim to them, and add a white outline. Runs entirely on the
 * phone with Google's MediaPipe person segmenter (Apache-2.0); the photo never
 * leaves the app for this. The engine (~11 MB) downloads once, the first time
 * someone makes a sticker, then it's cached.
 */

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const WORK_SIZE = 768; // photos are shrunk to this for cutting out (fast on phones)
const STICKER_SIZE = 512; // saved sticker's longest side

let segmenter: Promise<ImageSegmenter> | null = null;

function getSegmenter() {
  segmenter ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  })().catch((e) => {
    segmenter = null; // let the next attempt retry (e.g. after a bad connection)
    throw e;
  });
  return segmenter;
}

/** Start downloading the engine early (e.g. when a photo is opened) so the tap feels instant. */
export function warmUpCutout() {
  getSegmenter().catch(() => {});
}

const canvasOf = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/**
 * Cuts the person out of a photo and returns a finished sticker (transparent
 * background, white outline), or null if no person was found.
 */
export async function makeCutoutSticker(photo: Blob): Promise<HTMLCanvasElement | null> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, WORK_SIZE / Math.max(bitmap.width, bitmap.height));
  const W = Math.round(bitmap.width * scale);
  const H = Math.round(bitmap.height * scale);
  const work = canvasOf(W, H);
  work.getContext("2d")!.drawImage(bitmap, 0, 0, W, H);

  // 1. Where's the person? One confidence value (0-1) per mask pixel.
  const seg = await getSegmenter();
  const result = seg.segment(work);
  const masks = result.confidenceMasks ?? [];
  if (masks.length === 0) {
    result.close();
    return null;
  }
  // The selfie model gives one mask: how likely each pixel is the person.
  // (Multi-class models give several, with "background" first, so flip that one.)
  const mask = masks[0];
  const mw = mask.width;
  const mh = mask.height;
  const conf = mask.getAsFloat32Array().slice(); // copy: the mask is freed below
  const inverted = masks.length > 1;
  result.close();

  // 2. Mask → soft-edged alpha, at the mask's size.
  const maskCanvas = canvasOf(mw, mh);
  const mctx = maskCanvas.getContext("2d")!;
  const img = mctx.createImageData(mw, mh);
  for (let i = 0; i < conf.length; i++) {
    const p = inverted ? 1 - conf[i] : conf[i];
    const a = Math.min(1, Math.max(0, (p - 0.35) / 0.3)); // soft ramp keeps hair edges natural
    img.data[i * 4 + 3] = Math.round(a * 255);
  }
  mctx.putImageData(img, 0, 0);

  // 3. Photo, keeping only where the mask is (mask scaled up smoothly to the photo).
  const cut = canvasOf(W, H);
  const cctx = cut.getContext("2d")!;
  cctx.drawImage(work, 0, 0);
  cctx.globalCompositeOperation = "destination-in";
  cctx.drawImage(maskCanvas, 0, 0, W, H);

  // 4. Trim to the person. Too small = probably no one there.
  const box = opaqueBounds(cut);
  if (!box || box.w * box.h < W * H * 0.02) return null;

  // 5. White outline + scale to sticker size.
  return finishSticker(cut, box);
}

function opaqueBounds(c: HTMLCanvasElement) {
  const { data, width, height } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Puts a white sticker outline around the cutout and sizes it for saving. */
function finishSticker(cut: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }) {
  const border = Math.max(5, Math.round(Math.max(box.w, box.h) * 0.035));
  const pad = border + 2;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;

  // The person, trimmed.
  const person = canvasOf(w, h);
  person.getContext("2d")!.drawImage(cut, box.x, box.y, box.w, box.h, pad, pad, box.w, box.h);

  // A solid white copy of their shape.
  const silhouette = canvasOf(w, h);
  const sctx = silhouette.getContext("2d")!;
  sctx.drawImage(person, 0, 0);
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "#ffffff";
  sctx.fillRect(0, 0, w, h);

  // Stamp the white shape in a ring around them, then the person on top.
  const sticker = canvasOf(w, h);
  const ctx = sticker.getContext("2d")!;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.drawImage(silhouette, Math.cos(a) * border, Math.sin(a) * border);
  }
  ctx.drawImage(silhouette, 0, 0);
  ctx.drawImage(person, 0, 0);

  // Scale to the saved size.
  const s = Math.min(1, STICKER_SIZE / Math.max(w, h));
  if (s === 1) return sticker;
  const out = canvasOf(Math.round(w * s), Math.round(h * s));
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(sticker, 0, 0, out.width, out.height);
  return out;
}
