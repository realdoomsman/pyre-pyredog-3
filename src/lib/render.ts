import { dogById } from "./dogs";
import { frameById, stickerById } from "./frames";
import { PAL, alpha } from "./palette";

/** Everything needed to redraw a meme. Small enough to live in the key-value store. */
export interface MemeSpec {
  /** Stock picture id, or `null` when the user brought their own photo. */
  dogId: string | null;
  topText: string;
  bottomText: string;
  frameId: string;
  stickerId: string;
}

/** A saved meme as the server functions store and return it. */
export interface MemeRecord extends MemeSpec {
  id: string;
  createdAt: number;
  author: string;
  /** Downscaled JPEG of an uploaded photo, base64 without a data-URL prefix. */
  photo: string | null;
}

export const EXPORT_SIZE = 1024;
/** Uploaded photos are stored as thumbnails so 20 wall memes stay well under the 1MB result cap. */
export const PHOTO_MAX_CHARS = 26_000;
const PHOTO_MAX_PX = 320;

export function emptySpec(): MemeSpec {
  return { dogId: "pyredog", topText: "", bottomText: "", frameId: "edge", stickerId: "paw" };
}

function coverDraw(ctx: CanvasRenderingContext2D, S: number, bitmap: ImageBitmap): void {
  const scale = Math.max(S / bitmap.width, S / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (S - w) / 2, (S - h) / 2, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line === "" ? word : `${line} ${word}`;
    if (ctx.measureText(next).width <= maxWidth || line === "") line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, S: number, raw: string, where: "top" | "bottom"): void {
  const text = raw.trim().toUpperCase();
  if (text === "") return;

  const maxWidth = S * 0.88;
  let px = Math.round(S * 0.088);
  let lines: string[] = [];
  for (;;) {
    ctx.font = `600 ${px}px Geist, ui-sans-serif, system-ui, sans-serif`;
    lines = wrap(ctx, text, maxWidth);
    if (lines.length <= 3 || px <= S * 0.042) break;
    px = Math.round(px * 0.9);
  }
  lines = lines.slice(0, 4);

  const lh = px * 1.08;
  const top = where === "top" ? S * 0.055 : S * 0.945 - lh * lines.length;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.shadowColor = alpha(PAL.bg, 0.6);
  ctx.shadowBlur = S * 0.012;
  lines.forEach((line, i) => {
    const y = top + i * lh;
    ctx.strokeStyle = PAL.bg;
    ctx.lineWidth = px * 0.2;
    ctx.strokeText(line, S / 2, y, maxWidth);
    ctx.fillStyle = PAL.ink;
    ctx.fillText(line, S / 2, y, maxWidth);
  });
  ctx.restore();
}

/** Draws the whole meme at `size` px square. Deterministic: the spec is the only input. */
export function renderMeme(
  ctx: CanvasRenderingContext2D,
  size: number,
  spec: MemeSpec,
  photo: ImageBitmap | null,
  ticker: string,
): void {
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, size, size);

  if (photo !== null) coverDraw(ctx, size, photo);
  else {
    const dog = dogById(spec.dogId);
    if (dog !== null) dog.draw(ctx, size);
    else {
      ctx.fillStyle = PAL.surface;
      ctx.fillRect(0, 0, size, size);
    }
  }

  frameById(spec.frameId).draw(ctx, size, ticker);
  stickerById(spec.stickerId).draw(ctx, size, ticker);
  drawText(ctx, size, spec.topText, "top");
  drawText(ctx, size, spec.bottomText, "bottom");
  ctx.restore();
}

/** The display fonts have to be resident before the first canvas paint, or text falls back. */
export async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load('600 80px Geist'),
      document.fonts.load('500 40px "Geist Mono"'),
      document.fonts.ready,
    ]);
  } catch {
    // A missing webfont only changes the typeface, so drawing carries on regardless.
  }
}

/** Decodes an uploaded file without ever creating a URL for it. */
export async function decodeUpload(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function base64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? "" : dataUrl.slice(comma + 1);
}

/**
 * Shrinks an uploaded photo to a storable thumbnail, stepping quality and then size down
 * until the base64 payload fits `PHOTO_MAX_CHARS`. Returns `null` if it never fits.
 */
export function compressPhoto(bitmap: ImageBitmap): string | null {
  for (const px of [PHOTO_MAX_PX, 288, 256, 224]) {
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return null;
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, px, px);
    coverDraw(ctx, px, bitmap);
    for (const quality of [0.62, 0.5, 0.38, 0.28]) {
      const encoded = base64FromDataUrl(canvas.toDataURL("image/jpeg", quality));
      if (encoded !== "" && encoded.length <= PHOTO_MAX_CHARS) return encoded;
    }
  }
  return null;
}

/** Rebuilds a stored thumbnail into a bitmap, bypassing `data:` URLs and the CSP entirely. */
export async function bitmapFromBase64(encoded: string): Promise<ImageBitmap> {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
}

/** Renders at export size and hands the browser a PNG download. */
export async function downloadPng(spec: MemeSpec, photo: ImageBitmap | null, ticker: string): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("this browser cannot draw to a canvas");
  await ensureFonts();
  renderMeme(ctx, EXPORT_SIZE, spec, photo, ticker);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (blob === null) throw new Error("the image could not be encoded");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pyredog-${Date.now().toString(36)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can race the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** "4 minutes ago", for wall and gallery timestamps. */
export function timeAgo(ms: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
