import { HEAT, PAL, alpha } from "./palette";

/** A border stamped over the finished picture. `legendary` ones are a holder perk. */
export interface Frame {
  id: string;
  label: string;
  legendary: boolean;
  draw: (ctx: CanvasRenderingContext2D, size: number, ticker: string) => void;
}

/** A small corner stamp. */
export interface Sticker {
  id: string;
  label: string;
  draw: (ctx: CanvasRenderingContext2D, size: number, ticker: string) => void;
}

function strokeInset(ctx: CanvasRenderingContext2D, S: number, inset: number, width: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = S * width;
  ctx.strokeRect(S * inset, S * inset, S * (1 - inset * 2), S * (1 - inset * 2));
}

function monoLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  px: number,
  color: string,
): void {
  ctx.save();
  ctx.font = `500 ${px}px "Geist Mono", ui-monospace, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

export const FRAMES: Frame[] = [
  { id: "none", label: "None", legendary: false, draw: () => {} },
  {
    id: "edge",
    label: "Edge",
    legendary: false,
    draw: (ctx, S) => {
      strokeInset(ctx, S, 0.018, 0.012, PAL.violet);
      strokeInset(ctx, S, 0.042, 0.003, alpha(PAL.ink, 0.35));
    },
  },
  {
    id: "corners",
    label: "Corners",
    legendary: false,
    draw: (ctx, S) => {
      const m = S * 0.05;
      const len = S * 0.16;
      ctx.strokeStyle = PAL.violet;
      ctx.lineWidth = S * 0.014;
      ctx.lineCap = "square";
      for (const [cx, cy, dx, dy] of [
        [m, m, 1, 1],
        [S - m, m, -1, 1],
        [m, S - m, 1, -1],
        [S - m, S - m, -1, -1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(cx + dx * len, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * len);
        ctx.stroke();
      }
    },
  },
  {
    id: "plate",
    label: "Plate",
    legendary: false,
    draw: (ctx, S, ticker) => {
      ctx.fillStyle = alpha(PAL.bg, 0.72);
      ctx.fillRect(0, 0, S, S * 0.065);
      ctx.fillRect(0, S * 0.935, S, S * 0.065);
      strokeInset(ctx, S, 0.004, 0.008, PAL.border);
      monoLabel(ctx, `pyredog / ${ticker}`, S * 0.5, S * 0.967, S * 0.03, PAL.inkMuted);
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    legendary: true,
    draw: (ctx, S) => {
      const g = ctx.createLinearGradient(0, 0, S, S);
      HEAT.forEach((c, i) => g.addColorStop(i / (HEAT.length - 1), c));
      ctx.strokeStyle = g;
      ctx.lineWidth = S * 0.026;
      ctx.strokeRect(S * 0.013, S * 0.013, S * 0.974, S * 0.974);
      strokeInset(ctx, S, 0.045, 0.004, alpha(PAL.heat5, 0.5));
    },
  },
  {
    id: "crest",
    label: "Crest",
    legendary: true,
    draw: (ctx, S, ticker) => {
      const g = ctx.createLinearGradient(0, 0, S, 0);
      g.addColorStop(0, PAL.heat2);
      g.addColorStop(0.5, PAL.heat3);
      g.addColorStop(1, PAL.heat2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S * 0.075);
      monoLabel(ctx, `legendary / ${ticker}`, S * 0.5, S * 0.038, S * 0.034, PAL.heat6);
      ctx.strokeStyle = PAL.heat3;
      ctx.lineWidth = S * 0.018;
      ctx.strokeRect(S * 0.009, S * 0.009, S * 0.982, S * 0.982);
      ctx.fillStyle = PAL.heat5;
      for (const [x, y] of [
        [S * 0.06, S * 0.94],
        [S * 0.94, S * 0.94],
      ] as const) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-S * 0.014, -S * 0.014, S * 0.028, S * 0.028);
        ctx.restore();
      }
    },
  },
];

export const STICKERS: Sticker[] = [
  { id: "none", label: "None", draw: () => {} },
  {
    id: "paw",
    label: "Paw",
    draw: (ctx, S) => {
      ctx.save();
      ctx.translate(S * 0.86, S * 0.82);
      ctx.fillStyle = alpha(PAL.violet, 0.85);
      for (const [x, y, r] of [
        [-0.055, -0.04, 0.019],
        [-0.018, -0.056, 0.02],
        [0.019, -0.056, 0.02],
        [0.055, -0.04, 0.019],
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(x * S, y * S, r * S, r * S * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, S * 0.012, S * 0.062, S * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "tag",
    label: "Tag",
    draw: (ctx, S, ticker) => {
      const w = S * 0.3;
      const h = S * 0.075;
      const x = S * 0.03;
      const y = S * 0.03;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, S * 0.014);
      ctx.fillStyle = alpha(PAL.surface, 0.9);
      ctx.fill();
      ctx.strokeStyle = PAL.violet;
      ctx.lineWidth = S * 0.005;
      ctx.stroke();
      monoLabel(ctx, ticker, x + w / 2, y + h / 2, S * 0.036, PAL.violet);
    },
  },
  {
    id: "seal",
    label: "Seal",
    draw: (ctx, S) => {
      const cx = S * 0.855;
      const cy = S * 0.155;
      ctx.beginPath();
      ctx.arc(cx, cy, S * 0.085, 0, Math.PI * 2);
      ctx.fillStyle = alpha(PAL.heat2, 0.88);
      ctx.fill();
      ctx.strokeStyle = PAL.heat5;
      ctx.lineWidth = S * 0.006;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, S * 0.065, 0, Math.PI * 2);
      ctx.strokeStyle = alpha(PAL.heat6, 0.6);
      ctx.lineWidth = S * 0.003;
      ctx.stroke();
      monoLabel(ctx, "good", cx, cy - S * 0.018, S * 0.032, PAL.heat6);
      monoLabel(ctx, "dog", cx, cy + S * 0.022, S * 0.032, PAL.heat6);
    },
  },
];

export function frameById(id: string): Frame {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0]!;
}

export function stickerById(id: string): Sticker {
  return STICKERS.find((s) => s.id === id) ?? STICKERS[0]!;
}
