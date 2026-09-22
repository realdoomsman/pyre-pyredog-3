/**
 * The Pyre tokens as plain hex, for the one place Tailwind cannot reach: the 2D
 * canvas. Mirrors `--color-*` in `src/index.css` — keep the two in sync.
 */
export const PAL = {
  bg: "#0a0a0c",
  surface: "#111114",
  surfaceRaised: "#16161b",
  border: "#1f1f24",
  borderStrong: "#2c2c33",
  ink: "#f3f2ee",
  inkMuted: "#a3a29c",
  inkFaint: "#6b6a66",
  violet: "#9d8cff",
  violetHover: "#7a66f5",
  heat1: "#1c1b2e",
  heat2: "#3b2f7a",
  heat3: "#7a66f5",
  heat4: "#3e8bff",
  heat5: "#9cd2ff",
  heat6: "#e9f1ff",
} as const;

/** The heat ramp, cold to hot. Intensity only — never a UI accent. */
export const HEAT = [PAL.heat1, PAL.heat2, PAL.heat3, PAL.heat4, PAL.heat5, PAL.heat6] as const;

/** `rgb(... / a)` from one of the tokens above, for translucent canvas fills. */
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`;
}
