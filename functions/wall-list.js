/**
 * The public wall: the 20 most recently shared memes, newest first. Open to anonymous
 * visitors — the first screen is useful without logging in.
 */

function list(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

export default async function handler(_input, ship) {
  const ids = list(await ship.kv.get("wall:latest")).slice(0, 20);

  const items = [];
  for (const id of ids) {
    const record = await ship.kv.get(`meme:${id}`);
    if (record !== null && typeof record === "object") items.push(record);
  }

  return { items };
}
