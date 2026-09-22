import { useEffect, useMemo, useState, type ReactNode } from "react";
import { bitmapFromBase64, timeAgo, type MemeRecord, type MemeSpec } from "../lib/render";
import { Chip } from "./Chip";
import { MemeCanvas } from "./MemeCanvas";
import { cx } from "./cx";

export interface MemeTileProps {
  record: MemeRecord;
  ticker: string;
  /** Usually one ghost `<Button>`, e.g. delete. */
  action?: ReactNode;
  className?: string;
}

export function memeWords(record: MemeSpec): string {
  return [record.topText, record.bottomText].filter((line) => line.trim() !== "").join(" — ") || "untitled meme";
}

/** One saved meme, redrawn from its stored spec. Used by both the gallery and the wall. */
export function MemeTile({ record, ticker, action, className }: MemeTileProps) {
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    if (record.photo === null) return;
    bitmapFromBase64(record.photo)
      .then((bitmap) => {
        if (!cancelled) setPhoto(bitmap);
      })
      .catch(() => {
        // An undecodable thumbnail just leaves the frame and caption on their own.
      });
    return () => {
      cancelled = true;
    };
  }, [record.photo]);

  const spec = useMemo<MemeSpec>(
    () => ({
      dogId: record.dogId,
      topText: record.topText,
      bottomText: record.bottomText,
      frameId: record.frameId,
      stickerId: record.stickerId,
    }),
    [record.dogId, record.topText, record.bottomText, record.frameId, record.stickerId],
  );

  return (
    <figure className={cx("flex min-w-0 flex-col gap-2", className)}>
      <MemeCanvas alt={memeWords(record)} photo={photo} resolution={420} spec={spec} ticker={ticker} />
      <figcaption className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Chip>{record.author}</Chip>
          <span className="truncate font-mono text-xs text-ink-faint">{timeAgo(record.createdAt)}</span>
        </span>
        {action}
      </figcaption>
    </figure>
  );
}
