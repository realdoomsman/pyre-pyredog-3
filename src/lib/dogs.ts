import { PAL, alpha } from "./palette";

/**
 * The stock dog pictures. They are drawn with canvas primitives rather than shipped as
 * files: the app is served under `default-src 'self'`, and vector art stays crisp at the
 * 1024px export size while keeping every meme inside the Pyre palette.
 */
export interface DogArt {
  id: string;
  label: string;
  /** One line of context handed to the caption model. */
  vibe: string;
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}

interface DogParams {
  coat: string;
  coatDark: string;
  coatLight: string;
  sky: [string, string];
  ears: "floppy" | "pointy" | "half";
  eyes: "open" | "side" | "closed" | "shades";
  tongue: boolean;
  /** Head rotation in radians. */
  tilt: number;
  /** Extra props drawn on top: motion arcs, sound rings, sparks. */
  extra?: "speed" | "sound" | "spark" | "brow";
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  rotation = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Head-relative units: the head group is translated to its centre before these run. */
function drawEars(ctx: CanvasRenderingContext2D, S: number, p: DogParams): void {
  const flop = (side: 1 | -1): void => {
    ellipse(ctx, side * S * 0.182, S * 0.042, S * 0.058, S * 0.128, p.coatDark, side * 0.2);
    ellipse(ctx, side * S * 0.19, S * 0.055, S * 0.03, S * 0.078, alpha(PAL.violetHover, 0.4), side * 0.2);
  };
  const point = (side: 1 | -1, folded: boolean): void => {
    ctx.save();
    ctx.translate(side * S * 0.118, -S * 0.1);
    ctx.rotate(side * (folded ? 1.15 : 0.14));
    ctx.beginPath();
    ctx.moveTo(-S * 0.062, S * 0.075);
    ctx.quadraticCurveTo(-S * 0.008, -S * 0.135, S * 0.072, S * 0.05);
    ctx.closePath();
    ctx.fillStyle = p.coatDark;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-S * 0.03, S * 0.055);
    ctx.quadraticCurveTo(0, -S * 0.062, S * 0.036, S * 0.036);
    ctx.closePath();
    ctx.fillStyle = alpha(PAL.violetHover, 0.45);
    ctx.fill();
    ctx.restore();
  };

  if (p.ears === "floppy") {
    flop(-1);
    flop(1);
  } else if (p.ears === "pointy") {
    point(-1, false);
    point(1, false);
  } else {
    point(-1, false);
    point(1, true);
  }
}

function drawEyes(ctx: CanvasRenderingContext2D, S: number, p: DogParams): void {
  const y = -S * 0.03;
  const dx = S * 0.062;

  if (p.eyes === "closed") {
    ctx.strokeStyle = PAL.bg;
    ctx.lineWidth = S * 0.009;
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * dx, y - S * 0.008, S * 0.028, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    return;
  }
  if (p.eyes === "shades") {
    roundRect(ctx, -S * 0.125, y - S * 0.032, S * 0.25, S * 0.06, S * 0.018, PAL.bg);
    roundRect(ctx, -S * 0.116, y - S * 0.026, S * 0.096, S * 0.042, S * 0.013, alpha(PAL.heat4, 0.6));
    roundRect(ctx, S * 0.02, y - S * 0.026, S * 0.096, S * 0.042, S * 0.013, alpha(PAL.heat4, 0.6));
    return;
  }

  const look = p.eyes === "side" ? 1 : 0;
  for (const side of [-1, 1]) {
    ellipse(ctx, side * dx, y, S * 0.028, S * 0.031, PAL.ink);
    ellipse(ctx, side * dx + look * S * 0.013, y + S * 0.004, S * 0.014, S * 0.017, PAL.bg);
    ellipse(ctx, side * dx + look * S * 0.013 - S * 0.005, y - S * 0.004, S * 0.004, S * 0.004, PAL.ink);
  }
}

function drawExtra(ctx: CanvasRenderingContext2D, S: number, p: DogParams): void {
  if (p.extra === undefined) return;
  ctx.save();
  ctx.lineCap = "round";
  if (p.extra === "speed") {
    ctx.strokeStyle = alpha(PAL.heat5, 0.5);
    ctx.lineWidth = S * 0.01;
    for (const [i, y] of [0.4, 0.48, 0.56].entries()) {
      const len = S * (0.09 - i * 0.015);
      ctx.beginPath();
      ctx.moveTo(S * 0.11, S * y);
      ctx.lineTo(S * 0.11 + len, S * y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(S * 0.89, S * y);
      ctx.lineTo(S * 0.89 - len, S * y);
      ctx.stroke();
    }
  } else if (p.extra === "sound") {
    ctx.strokeStyle = alpha(PAL.heat5, 0.42);
    ctx.lineWidth = S * 0.008;
    for (const r of [0.1, 0.15, 0.2]) {
      ctx.beginPath();
      ctx.arc(S * 0.655, S * 0.3, S * r, -1.5, -0.1);
      ctx.stroke();
    }
  } else if (p.extra === "spark") {
    ctx.fillStyle = PAL.heat5;
    for (const [x, y, r] of [
      [0.29, 0.2, 0.017],
      [0.72, 0.16, 0.012],
      [0.78, 0.31, 0.009],
    ] as const) {
      ctx.save();
      ctx.translate(S * x, S * y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-S * r, -S * r, S * r * 2, S * r * 2);
      ctx.restore();
    }
  } else {
    ctx.strokeStyle = PAL.bg;
    ctx.lineWidth = S * 0.008;
    ctx.beginPath();
    ctx.arc(S * 0.565, S * 0.335, S * 0.045, Math.PI * 1.15, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.restore();
}

/** One flat-vector dog portrait. Proportions are fractions of the square canvas. */
function drawDog(ctx: CanvasRenderingContext2D, S: number, p: DogParams): void {
  const sky = ctx.createLinearGradient(0, 0, 0, S);
  sky.addColorStop(0, p.sky[0]);
  sky.addColorStop(1, p.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, S, S);

  const halo = ctx.createRadialGradient(S * 0.5, S * 0.44, S * 0.05, S * 0.5, S * 0.44, S * 0.34);
  halo.addColorStop(0, alpha(PAL.violet, 0.16));
  halo.addColorStop(1, alpha(PAL.violet, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  ellipse(ctx, S * 0.5, S * 0.955, S * 0.24, S * 0.03, alpha(PAL.bg, 0.5));

  // neck, front legs, chest — drawn before the head so the head sits in front
  roundRect(ctx, S * 0.42, S * 0.5, S * 0.16, S * 0.28, S * 0.05, p.coatDark);
  roundRect(ctx, S * 0.375, S * 0.79, S * 0.072, S * 0.16, S * 0.034, p.coatDark);
  roundRect(ctx, S * 0.553, S * 0.79, S * 0.072, S * 0.16, S * 0.034, p.coatDark);
  ellipse(ctx, S * 0.5, S * 0.845, S * 0.215, S * 0.18, p.coat);
  ellipse(ctx, S * 0.5, S * 0.895, S * 0.082, S * 0.095, alpha(p.coatLight, 0.5));

  // collar, on the strip of neck between head and chest
  roundRect(ctx, S * 0.4, S * 0.612, S * 0.2, S * 0.034, S * 0.016, PAL.violetHover);
  ellipse(ctx, S * 0.5, S * 0.652, S * 0.021, S * 0.021, PAL.heat5);

  ctx.save();
  ctx.translate(S * 0.5, S * 0.425);
  ctx.rotate(p.tilt);

  drawEars(ctx, S, p);

  ellipse(ctx, 0, 0, S * 0.17, S * 0.158, p.coat);
  ellipse(ctx, 0, -S * 0.068, S * 0.132, S * 0.078, p.coatLight);

  drawEyes(ctx, S, p);

  // muzzle, nose, mouth
  ellipse(ctx, 0, S * 0.072, S * 0.1, S * 0.075, p.coatLight);
  ellipse(ctx, 0, S * 0.036, S * 0.032, S * 0.025, PAL.bg);
  ctx.strokeStyle = PAL.bg;
  ctx.lineWidth = S * 0.008;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, S * 0.058);
  ctx.lineTo(0, S * 0.076);
  ctx.moveTo(0, S * 0.076);
  ctx.quadraticCurveTo(-S * 0.026, S * 0.1, -S * 0.042, S * 0.072);
  ctx.moveTo(0, S * 0.076);
  ctx.quadraticCurveTo(S * 0.026, S * 0.1, S * 0.042, S * 0.072);
  ctx.stroke();

  if (p.tongue) {
    roundRect(ctx, -S * 0.024, S * 0.082, S * 0.048, S * 0.058, S * 0.022, PAL.violet);
    ctx.strokeStyle = alpha(PAL.bg, 0.45);
    ctx.lineWidth = S * 0.005;
    ctx.beginPath();
    ctx.moveTo(0, S * 0.096);
    ctx.lineTo(0, S * 0.132);
    ctx.stroke();
  }

  ctx.restore();

  drawExtra(ctx, S, p);
}

const BASE: DogParams = {
  coat: "#3a3a44",
  coatDark: "#2c2c33",
  coatLight: "#55545f",
  sky: [PAL.heat1, PAL.bg],
  ears: "floppy",
  eyes: "open",
  tongue: false,
  tilt: 0,
};

export const STOCK_DOGS: DogArt[] = [
  {
    id: "loaf",
    label: "Loaf",
    vibe: "a dog settled into a perfect loaf, refusing to move",
    draw: (ctx, S) => drawDog(ctx, S, { ...BASE, eyes: "closed" }),
  },
  {
    id: "zoomies",
    label: "Zoomies",
    vibe: "a dog mid-zoomies, tongue out, no brakes",
    draw: (ctx, S) =>
      drawDog(ctx, S, {
        ...BASE,
        coat: "#4a4358",
        coatLight: "#6a5f7e",
        sky: [PAL.heat2, PAL.heat1],
        ears: "pointy",
        tongue: true,
        tilt: -0.14,
        extra: "speed",
      }),
  },
  {
    id: "sideeye",
    label: "Side-eye",
    vibe: "a dog giving a long, judgemental side-eye",
    draw: (ctx, S) => drawDog(ctx, S, { ...BASE, eyes: "side", ears: "half", tilt: 0.1, extra: "brow" }),
  },
  {
    id: "howl",
    label: "Howl",
    vibe: "a dog howling at nothing in particular at 3am",
    draw: (ctx, S) =>
      drawDog(ctx, S, {
        ...BASE,
        coat: "#33323d",
        coatLight: "#4d4b59",
        sky: ["#131327", PAL.bg],
        ears: "pointy",
        eyes: "closed",
        tongue: true,
        tilt: -0.26,
        extra: "sound",
      }),
  },
  {
    id: "cool",
    label: "Shades",
    vibe: "a dog in sunglasses who knows exactly what it did",
    draw: (ctx, S) =>
      drawDog(ctx, S, {
        ...BASE,
        coat: "#3f3b4e",
        coatLight: "#5d576f",
        sky: [PAL.heat2, "#14131f"],
        eyes: "shades",
        ears: "half",
      }),
  },
  {
    id: "pyredog",
    label: "Pyredog",
    vibe: "the violet Pyredog mascot, smug and fully aware of the charts",
    draw: (ctx, S) =>
      drawDog(ctx, S, {
        ...BASE,
        coat: "#5b4f8a",
        coatDark: "#3b2f7a",
        coatLight: "#7d6fb8",
        sky: [PAL.heat2, PAL.heat1],
        tongue: true,
        tilt: 0.06,
        extra: "spark",
      }),
  },
];

export function dogById(id: string | null): DogArt | null {
  if (id === null) return null;
  return STOCK_DOGS.find((d) => d.id === id) ?? null;
}
