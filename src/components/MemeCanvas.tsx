import { useEffect, useRef } from "react";
import { renderMeme, ensureFonts, type MemeSpec } from "../lib/render";
import { cx } from "./cx";

export interface MemeCanvasProps {
  spec: MemeSpec;
  photo: ImageBitmap | null;
  /** Internal pixel size of the square canvas; CSS scales it to the column width. */
  resolution?: number;
  ticker: string;
  /** Description for assistive tech: the meme's own words. */
  alt: string;
  className?: string;
}

/** Draws a meme spec onto a square canvas and repaints whenever the spec changes. */
export function MemeCanvas({ spec, photo, resolution = 640, ticker, alt, className }: MemeCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const paint = async (): Promise<void> => {
      await ensureFonts();
      if (cancelled) return;
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d") ?? null;
      if (ctx === null) return;
      renderMeme(ctx, resolution, spec, photo, ticker);
    };
    void paint();
    return () => {
      cancelled = true;
    };
    // The spec is flat, so its fields are the real dependencies.
  }, [spec, spec.dogId, spec.topText, spec.bottomText, spec.frameId, spec.stickerId, photo, resolution, ticker]);

  return (
    <canvas
      aria-label={alt}
      className={cx("block aspect-square w-full rounded-card border border-border bg-bg", className)}
      height={resolution}
      ref={ref}
      role="img"
      width={resolution}
    />
  );
}
