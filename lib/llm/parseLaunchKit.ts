import type { LaunchKit } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// Parse + harden the JSON returned by the LLM into a LaunchKit.
//
// We intentionally avoid pulling in zod to keep the dependency surface
// small. Validation is manual but exhaustive enough that the rest of the
// app can trust the shape.
// ─────────────────────────────────────────────────────────────────────────

export class LaunchKitParseError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.raw = raw;
  }
}

const REQUIRED_FIELDS: (keyof LaunchKit)[] = [
  "tokenName",
  "ticker",
  "shortDescription",
  "longDescription",
  "mascotConcept",
  "pumpMetadata",
  "xBio",
  "launchTweets",
  "raidReplies",
  "influencerDmTemplates",
  "telegramAnnouncement",
  "dexscreenerCopy",
  "cmcDescription",
  "sevenDayPlan",
  "dailyChecklist",
];

export function parseLaunchKit(raw: string): LaunchKit {
  const text = stripFences(raw).trim();
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    throw new LaunchKitParseError(
      `LLM output is not valid JSON: ${(e as Error).message}`,
      raw
    );
  }

  for (const k of REQUIRED_FIELDS) {
    if (!(k in obj)) {
      throw new LaunchKitParseError(`LLM output missing required field: ${k}`, raw);
    }
  }

  // Ticker normalization (defensive — UI also normalizes)
  if (typeof obj.ticker === "string") {
    obj.ticker = obj.ticker.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }

  // Coerce arrays so downstream UI doesn't crash if the model returned wrong types.
  obj.launchTweets = ensureStringArray(obj.launchTweets);
  obj.raidReplies = ensureStringArray(obj.raidReplies);
  obj.influencerDmTemplates = ensureStringArray(obj.influencerDmTemplates);
  obj.dailyChecklist = ensureStringArray(obj.dailyChecklist);

  // sevenDayPlan should be exactly 7 entries with the right shape.
  if (!Array.isArray(obj.sevenDayPlan)) {
    obj.sevenDayPlan = [];
  } else {
    obj.sevenDayPlan = (obj.sevenDayPlan as unknown[])
      .filter(
        (d): d is { day: unknown; title: unknown; bullets: unknown } =>
          typeof d === "object" && d !== null && "day" in d && "title" in d
      )
      .slice(0, 7)
      .map((d, i) => ({
        day: typeof d.day === "number" ? d.day : i + 1,
        title: typeof d.title === "string" ? d.title : `Day ${i + 1}`,
        bullets: ensureStringArray(d.bullets),
      }));
  }

  // pumpMetadata sanity
  if (
    typeof obj.pumpMetadata !== "object" ||
    obj.pumpMetadata === null ||
    Array.isArray(obj.pumpMetadata)
  ) {
    throw new LaunchKitParseError(
      "LLM output's pumpMetadata is not an object",
      raw
    );
  }

  return obj as unknown as LaunchKit;
}

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  return t;
}

function ensureStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : String(x ?? "")))
    .filter((x) => x.length > 0);
}
