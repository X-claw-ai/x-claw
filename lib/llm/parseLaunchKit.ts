import type { LaunchKit } from "@/lib/types";

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

  // Coerce arrays
  obj.launchTweets = ensureStringArray(obj.launchTweets);
  obj.raidReplies = ensureStringArray(obj.raidReplies);
  obj.influencerDmTemplates = ensureStringArray(obj.influencerDmTemplates);
  obj.dailyChecklist = ensureStringArray(obj.dailyChecklist);
  obj.viralHooks = ensureStringArray(obj.viralHooks ?? []);
  obj.threadIdeas = ensureStringArray(obj.threadIdeas ?? []);

  // String fields with defaults if model omitted them
  obj.memeThesis = ensureString(obj.memeThesis, "");
  obj.tagline = ensureString(obj.tagline, "");
  obj.imagePrompt = ensureString(obj.imagePrompt, "");
  obj.founderAnnouncement = ensureString(obj.founderAnnouncement, "");
  obj.productAnnouncement = ensureString(obj.productAnnouncement, "");
  obj.discordAnnouncement = ensureString(obj.discordAnnouncement, "");
  obj.communityOnboarding = ensureString(obj.communityOnboarding, "");
  obj.raidMission = ensureString(obj.raidMission, "");

  // FAQ array of {q,a}
  if (!Array.isArray(obj.faq)) {
    obj.faq = [];
  } else {
    obj.faq = (obj.faq as unknown[])
      .filter(
        (x): x is { q: unknown; a: unknown } =>
          typeof x === "object" && x !== null && "q" in x && "a" in x
      )
      .slice(0, 7)
      .map((x) => ({ q: String(x.q ?? ""), a: String(x.a ?? "") }))
      .filter((x) => x.q && x.a);
  }

  // sevenDayPlan
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

function ensureString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}
