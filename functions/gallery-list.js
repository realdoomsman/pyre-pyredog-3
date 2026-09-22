/**
 * The caller's saved memes, newest first, in pages small enough for the 1MB result cap
 * (uploaded photos travel inside each record). Also reports the quota so the UI can show
 * "3 of 5 saved" without a second call.
 */

const FREE_LIMIT = 5;
const HOLDER_LIMIT = 200;
const PAGE = 12;

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

  const isHolder = ship.user.isHolder === true;
  const ids = list(await ship.kv.get(`gallery:${userKey(ship.user.id)}`));
  const offsetRaw = Number(input?.offset);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
  const page = ids.slice(offset, offset + PAGE);

  const items = [];
  for (const id of page) {
    const record = await ship.kv.get(`meme:${id}`);
    if (record !== null && typeof record === "object") items.push(record);
  }

  return {
    ok: true,
    items,
    total: ids.length,
    offset,
    pageSize: PAGE,
    limit: isHolder ? HOLDER_LIMIT : FREE_LIMIT,
    isHolder,
  };
}
