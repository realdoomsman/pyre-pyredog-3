/**
 * Saves one meme to the caller's gallery and, unless they opt out, to the public wall.
 *
 * Storage shape (app scope, written only from here):
 *   meme:<id>          the full record, including an uploaded photo thumbnail
 *   gallery:<user>     newest-first list of that user's meme ids
 *   wall:latest        newest-first list of at most 20 publicly shared meme ids
 *
 * Free accounts keep 5 memes; holders are unlimited (capped at 200 so one account cannot
 * fill the store). The wall runs a basic profanity filter — a blocked meme is still saved
 * privately, it just never reaches the wall.
 */

const FREE_LIMIT = 5;
const HOLDER_LIMIT = 200;
const WALL_SIZE = 20;
const PHOTO_MAX_CHARS = 26000;

const BLOCKED = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigg",
  "fag",
  "retard",
  "rape",
  "whore",
  "slut",
  "kys",
  "pussy",
  "asshole",
  "bastard",
];

const ID_RE = /^[a-z0-9-]{1,24}$/;
const B64_RE = /^[A-Za-z0-9+/=]+$/;

function text(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function id(value) {
  return typeof value === "string" && ID_RE.test(value) ? value : null;
}

function userKey(raw) {
  return raw.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 100);
}

/** Short stable handle so the wall can credit a maker without exposing their id. */
function handle(raw) {
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) hash = ((hash * 33) ^ raw.charCodeAt(i)) >>> 0;
  return `dog-${hash.toString(36).slice(0, 5)}`;
}

function isClean(phrase) {
  const flat = phrase.toLowerCase().replace(/[^a-z]/g, "");
  return !BLOCKED.some((word) => flat.includes(word));
}

function list(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

export default async function handler(input, ship) {
  if (typeof ship.user?.id !== "string" || ship.user.id === "") {
    return { ok: false, reason: "anon" };
  }

  const topText = text(input?.topText, 100);
  const bottomText = text(input?.bottomText, 100);
  const dogId = id(input?.dogId);
  const frameId = id(input?.frameId) ?? "none";
  const stickerId = id(input?.stickerId) ?? "none";
  const photoRaw = typeof input?.photo === "string" ? input.photo : null;
  const photo = photoRaw !== null && photoRaw.length <= PHOTO_MAX_CHARS && B64_RE.test(photoRaw) ? photoRaw : null;

  if (dogId === null && photo === null) return { ok: false, reason: "no_picture" };
  if (topText === "" && bottomText === "") return { ok: false, reason: "no_text" };

  const owner = userKey(ship.user.id);
  const galleryKey = `gallery:${owner}`;
  const ids = list(await ship.kv.get(galleryKey));
  const isHolder = ship.user.isHolder === true;
  const limit = isHolder ? HOLDER_LIMIT : FREE_LIMIT;
  if (ids.length >= limit) {
    return { ok: false, reason: isHolder ? "cap" : "limit", saved: ids.length, limit, isHolder };
  }

  const memeId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    id: memeId,
    createdAt: Date.now(),
    author: handle(ship.user.id),
    dogId,
    topText,
    bottomText,
    frameId,
    stickerId,
    photo,
  };
  await ship.kv.set(`meme:${memeId}`, record);
  await ship.kv.set(galleryKey, [memeId, ...ids]);

  let shared = false;
  let filtered = false;
  if (input?.share !== false) {
    if (isClean(`${topText} ${bottomText}`)) {
      const wall = list(await ship.kv.get("wall:latest"));
      await ship.kv.set("wall:latest", [memeId, ...wall.filter((x) => x !== memeId)].slice(0, WALL_SIZE));
      shared = true;
    } else {
      filtered = true;
    }
  }

  return { ok: true, id: memeId, saved: ids.length + 1, limit, isHolder, shared, filtered };
}
