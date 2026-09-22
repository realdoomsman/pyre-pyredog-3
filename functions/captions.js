/**
 * Five caption ideas for a meme, from one short description of the moment.
 *
 * Voices marked `holderOnly` below are a holder perk: the check uses `ship.user.isHolder`,
 * so a hand-rolled request cannot unlock them. When the platform model is unreachable the
 * function still answers, with locally composed ideas labelled `source: "offline"`.
 */

const VOICES = [
  {
    id: "deadpan",
    holderOnly: false,
    brief: "flat and deadpan, understated, never explains the joke",
  },
  {
    id: "menace",
    holderOnly: false,
    brief: "a small menace who has already broken something and regrets nothing",
  },
  {
    id: "noir",
    holderOnly: true,
    brief: "a 1940s noir detective narrating the case of the missing dinner",
  },
  {
    id: "announcer",
    holderOnly: true,
    brief: "a breathless sports commentator calling the action live",
  },
  {
    id: "bard",
    holderOnly: true,
    brief: "a medieval bard in mock-epic register, grand words for tiny events",
  },
  {
    id: "monk",
    holderOnly: true,
    brief: "a calm monk offering short koans about the nature of dog",
  },
];

const FALLBACKS = [
  (v) => `nobody asked, but: ${v}`,
  (v) => `${v}. and that is the whole plan`,
  (v) => `situation report: ${v}`,
  (v) => `they said ${v} was impossible`,
  (v) => `day 41 of ${v}`,
];

function clean(line) {
  return line
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

export default async function handler(input, ship) {
  const rawVibe = typeof input?.vibe === "string" ? input.vibe.trim().slice(0, 240) : "";
  const vibe = rawVibe === "" ? "a dog doing nothing much, with great commitment" : rawVibe;

  const asked = typeof input?.voice === "string" ? input.voice : "deadpan";
  const match = VOICES.find((v) => v.id === asked) ?? VOICES[0];
  const allowed = !match.holderOnly || ship.user.isHolder === true;
  const voice = allowed ? match : VOICES[0];

  const prompt = [
    "You write short meme captions for Pyredog, a violet cartoon dog.",
    `Voice: ${voice.brief}.`,
    `The moment: ${vibe}`,
    "Write exactly 5 different captions for this picture.",
    "Rules: at most 60 characters each, lowercase unless a word needs a capital,",
    "no emoji, no hashtags, no quotation marks, no explanations.",
    "Output only the captions, one per line, each prefixed with '- '.",
  ].join("\n");

  let captions = [];
  let source = "model";
  let error = null;
  try {
    const answer = await ship.llm(prompt, { maxTokens: 400 });
    const text = typeof answer === "string" ? answer : String(answer?.text ?? "");
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    // Models like to introduce their list. Keep the marked-up lines when there are enough
    // of them, otherwise take every line that is not an obvious preamble.
    const marked = lines.filter((line) => /^(?:[-*•]|\d+[.)])\s+/.test(line));
    const chosen = marked.length >= 3 ? marked : lines.filter((line) => !line.endsWith(":"));
    for (const line of chosen.map(clean)) {
      if (captions.length >= 5) break;
      if (line.length > 1 && !captions.includes(line)) captions.push(line);
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  if (captions.length < 5) {
    source = captions.length === 0 ? "offline" : "mixed";
    const short = vibe.replace(/[.!?]+$/, "").slice(0, 60);
    for (const make of FALLBACKS) {
      if (captions.length >= 5) break;
      const line = clean(make(short));
      if (!captions.includes(line)) captions.push(line);
    }
  }

  return { captions: captions.slice(0, 5), source, voice: voice.id, downgraded: !allowed, error };
}
