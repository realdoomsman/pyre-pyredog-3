/**
 * Removes one of the caller's memes: from their gallery, from the public wall and from
 * storage. Only ids listed in the caller's own gallery can be deleted.
 */

const ID_RE = /^[a-z0-9]{1,32}$/;

function userKey(raw) {
  return raw.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 100);
}

function list(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

export default async function handler(input, ship) {
  if (typeof ship.user?.id !== "string" || ship.user.id === "") {
    return { ok: false, reason: "anon" };
  }
  const id = typeof input?.id === "string" && ID_RE.test(input.id) ? input.id : null;
  if (id === null) return { ok: false, reason: "bad_id" };

  const galleryKey = `gallery:${userKey(ship.user.id)}`;
  const ids = list(await ship.kv.get(galleryKey));
  if (!ids.includes(id)) return { ok: false, reason: "not_found" };

  await ship.kv.set(
    galleryKey,
    ids.filter((entry) => entry !== id),
  );
  const wall = list(await ship.kv.get("wall:latest"));
  if (wall.includes(id)) {
    await ship.kv.set(
      "wall:latest",
      wall.filter((entry) => entry !== id),
    );
  }
  await ship.kv.del(`meme:${id}`);

  return { ok: true, saved: ids.length - 1 };
}
