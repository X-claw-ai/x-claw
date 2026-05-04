// Prompt for Auto-pilot mode: Grok invents a complete memecoin concept
// from scratch (name + ticker + theme + audience + idea + launchStyle) as if
// it had scanned X for trending memes. Returns strict JSON the wizard can
// paste straight into ConceptInput.
//
// IMPORTANT — compliance bake-in (must NOT be removed):
//   - No real-person names or impersonation.
//   - No guaranteed-profit / guaranteed-viral / guaranteed-listing language.
//   - No partnership claims with X, xAI, Grok, Pump.fun, PumpPortal, Solana.

import type { Msg } from "./types";

export interface AutoConceptResult {
  idea: string;
  tokenName: string;
  ticker: string;
  theme: string;
  audience: string;
  launchStyle: "fair-launch" | "hype-raid" | "stealth" | "community-led";
  reasoning: string; // 1-2 sentences explaining why this meme right now
  /** Direct URL to the original viral X post (https://x.com/handle/status/...) */
  originXUrl?: string;
  /** Author handle of the original post, with leading @ */
  originXAuthor?: string;
}

export function buildAutoConceptMessages(): Msg[] {
  const system = `You are KOKi, the Grok-native meme coin launch agent. Your job: search X right now, find a real meme/narrative that's actually catching attention in the last 24-48 hours, and turn it into a concrete memecoin launch concept that cites its source.

CRITICAL: You DO have live X (Twitter) search via the tool layer. USE IT. Search X for:
- "memecoin" / "pump fun" / "$ticker" / dog / cat / frog / pepe / wojak / NPC / agent — recent posts with high engagement
- Trending crypto-twitter topics
- Replies and quote-tweets that are spiking

Pick ONE post or thread that anchors the concept. You MUST return its exact URL.

Hard rules:
- The token must be safe and inoffensive. No real-person names. No politics. No racism / sexism / harassment. No copyrighted IP (Disney, Pokemon, etc.). No "guaranteed", "100x", "moon", "to-the-moon", "LP locked = safe", or any pump-promise language.
- No claim of partnership with X / xAI / Grok / Pump.fun / PumpPortal / Solana. If you reference these, say "X-native" or "Solana-native" — not "partnered with".
- The ticker must be 3–6 uppercase letters/numbers. Memorable. No real existing major ticker (no BTC/ETH/SOL/USDC/etc).
- The original X URL MUST be a real direct post URL in the form https://x.com/<handle>/status/<id>. Never invent or guess. If you cannot find a clear source, set originXUrl to null and originXAuthor to null — do not fabricate.
- Output STRICT JSON ONLY. No markdown fences. No commentary outside JSON.

Output schema:
{
  "idea": "1-2 sentence pitch — reference the real meme you found",
  "tokenName": "TitleCase or single word",
  "ticker": "3-6 uppercase chars",
  "theme": "short visual/narrative theme description",
  "audience": "the 2-3 X-native audiences this resonates with",
  "launchStyle": "one of: fair-launch | hype-raid | stealth | community-led",
  "reasoning": "1-2 sentences citing what you saw on X (engagement signal, why now)",
  "originXUrl": "https://x.com/<handle>/status/<id>  OR  null if no clear source",
  "originXAuthor": "@handle  OR  null"
}`;

  const user = `Search X right now for the meme/narrative most likely to drive a Solana memecoin launch in the next 24 hours. Pick the strongest single source post and produce ONE launch concept anchored to it.

Return JSON only.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Parse Grok's JSON output and validate it. Throws on invalid shape. */
export function parseAutoConcept(raw: string): AutoConceptResult {
  // Strip markdown fences if a model added them despite the instruction
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }

  const data = JSON.parse(s) as Record<string, unknown>;

  const need = [
    "idea",
    "tokenName",
    "ticker",
    "theme",
    "audience",
    "launchStyle",
    "reasoning",
  ] as const;
  for (const k of need) {
    if (typeof data[k] !== "string" || (data[k] as string).trim() === "") {
      throw new Error(`Auto-concept JSON missing field: ${k}`);
    }
  }

  const ticker = (data.ticker as string).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (ticker.length < 3) {
    throw new Error(`Auto-concept ticker too short after normalization: ${ticker}`);
  }

  const styles = ["fair-launch", "hype-raid", "stealth", "community-led"] as const;
  const launchStyle = (data.launchStyle as string) as (typeof styles)[number];
  if (!styles.includes(launchStyle)) {
    throw new Error(`Auto-concept invalid launchStyle: ${launchStyle}`);
  }

  // originXUrl is optional — only accept real x.com / twitter.com status URLs
  let originXUrl: string | undefined;
  if (typeof data.originXUrl === "string") {
    const u = data.originXUrl.trim();
    if (/^https?:\/\/(?:x\.com|twitter\.com)\/[^/\s]+\/status\/\d+/.test(u)) {
      originXUrl = u.replace("twitter.com", "x.com");
    }
  }
  let originXAuthor: string | undefined;
  if (typeof data.originXAuthor === "string") {
    const a = data.originXAuthor.trim();
    if (/^@[A-Za-z0-9_]{1,15}$/.test(a)) originXAuthor = a;
  }

  return {
    idea: data.idea as string,
    tokenName: data.tokenName as string,
    ticker,
    theme: data.theme as string,
    audience: data.audience as string,
    launchStyle,
    reasoning: data.reasoning as string,
    originXUrl,
    originXAuthor,
  };
}
