import { NotAuthenticatedError, ship } from "@pyre/app-sdk";
import type { MemeRecord, MemeSpec } from "./render";

/** Caption voices. The holder-only ones are enforced again in `functions/captions.js`. */
export const VOICES: { id: string; label: string; holderOnly: boolean }[] = [
  { id: "deadpan", label: "Deadpan", holderOnly: false },
  { id: "menace", label: "Menace", holderOnly: false },
  { id: "noir", label: "Noir", holderOnly: true },
  { id: "announcer", label: "Announcer", holderOnly: true },
  { id: "bard", label: "Bard", holderOnly: true },
  { id: "monk", label: "Monk", holderOnly: true },
];

export interface CaptionsResult {
  captions: string[];
  source: "model" | "mixed" | "offline";
  voice: string;
  downgraded: boolean;
  error: string | null;
}

export interface SaveResult {
  ok: boolean;
  reason?: "anon" | "limit" | "cap" | "no_picture" | "no_text";
  id?: string;
  saved?: number;
  limit?: number;
  isHolder?: boolean;
  shared?: boolean;
  filtered?: boolean;
}

export interface GalleryResult {
  ok: boolean;
  reason?: string;
  items: MemeRecord[];
  total: number;
  offset: number;
  pageSize: number;
  limit: number;
  isHolder: boolean;
}

export const suggestCaptions = (vibe: string, voice: string): Promise<CaptionsResult> =>
  ship.fn<CaptionsResult>("captions", { vibe, voice });

export const listWall = (): Promise<{ items: MemeRecord[] }> => ship.fn<{ items: MemeRecord[] }>("wall-list", {});

export const listGallery = (offset: number): Promise<GalleryResult> =>
  ship.fn<GalleryResult>("gallery-list", { offset });

export const saveMeme = (spec: MemeSpec, photo: string | null, share: boolean): Promise<SaveResult> =>
  ship.fn<SaveResult>("save-meme", { ...spec, photo, share });

export const deleteMeme = (id: string): Promise<{ ok: boolean; reason?: string }> =>
  ship.fn<{ ok: boolean; reason?: string }>("delete-meme", { id });

/** One readable sentence for any thrown value, including the SDK's auth error. */
export function failureText(cause: unknown, fallback: string): string {
  if (cause instanceof NotAuthenticatedError) return "that needs a login — sign in and try again.";
  const raw = cause instanceof Error ? cause.message : String(cause);
  return raw.trim() === "" ? fallback : raw;
}
