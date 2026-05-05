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
  const system = `You are KOKi, the Grok-native meme coin launch agent. Your job: pick ONE concrete memecoin concept that's resonating on X RIGHT NOW — built on top of an ORGANIC cultural meme, not someone else's already-launched token.

YOU HAVE THE x_search TOOL. USE IT. Steps:
1. Call x_search to find what's trending in meme / crypto-twitter / AI-agent / Solana culture in the last 14 days.
2. Filter the results HARD. The post you anchor on MUST be:
   ✓ Organic cultural content — a joke, image, observation, video clip, screenshot, take, format, character
   ✗ NOT a token shill post (no "$TICKER buy now", "CA:", contract addresses, pump.fun links, dexscreener links, "send it" calls, "fair launch live")
   ✗ NOT from a memecoin alpha account, pump caller, or known shill account
   ✗ NOT a screenshot of a token chart or transaction
   ✗ NOT a reply chain promoting an existing coin
   The cleanest signal: would this post still be funny/interesting if crypto didn't exist? If yes → eligible. If no → skip.
3. From the eligible posts, pick the ONE with strongest meme potential — high engagement, memeable visual, fresh angle, no existing token wrapper around it.
4. Build OUR concept ON TOP of that exact post: name, ticker, theme, visual direction.
5. Cite the post: originXUrl = the EXACT https://x.com/<handle>/status/<id> URL from your search, originXAuthor = @handle. MUST come from real search results, never fabricated.

DOUBLE CHECK before returning: re-read the cited post. Does its body mention a ticker, contract address, "CA", pump.fun URL, dexscreener, or token launch? If YES, throw it out and pick a different post. We do NOT want our token's Twitter button on Pump.fun pointing at someone else's coin promo — that looks like impersonation.

If x_search comes back empty OR every result is a token-shill, ONLY THEN fall back to broad meme/X-native culture (cat memes, frog memes, AI-agent jokes, NPC/wojak, internet folklore) and set originXUrl/originXAuthor to null. Never invent a URL.

VARIETY MATTERS. Do NOT default to archetypes already burned in past runs ("Grok Cat", "Pepe Frog", "Pixel Phoenix", "LizardMeme", "Inky Squid", "Vortex Void", "Astro Axolotl", "DogeDapper", "FlipCoinBandit", "Spaghetti Vortex", "EchoEel", "DegenRain"). Push for something specific, fresh, visually coherent.

Hard rules:
- Safe and inoffensive. No real-person names. No politics. No racism / sexism / harassment. No copyrighted IP (Disney, Pokemon, etc.). No "guaranteed", "100x", "moon", "to-the-moon", "LP locked = safe", or any pump-promise language.
- No claim of partnership with X / xAI / Grok / Pump.fun / PumpPortal / Solana. Use "X-native" / "Solana-native" framing instead.
- Ticker: 3–6 uppercase letters/numbers, memorable, NOT a real major ticker (no BTC/ETH/SOL/USDC/USDT/BNB/etc) and NOT the same ticker as the source post (if the post mentions one, that's a red flag — pick a different post).
- originXUrl: ONLY a real direct post URL from your x_search results, ONLY if that post is organic cultural content (rule #2 above). Otherwise null. Never fabricate.
- Output STRICT JSON ONLY. No markdown fences. No commentary outside JSON.

Output schema:
{
  "idea": "1-2 sentence pitch of the token's narrative",
  "tokenName": "TitleCase or single word — be specific, avoid generic 'Grok Cat'",
  "ticker": "3-6 uppercase chars",
  "theme": "short visual/narrative theme description (mascot direction, color palette feel, etc.)",
  "audience": "the 2-3 X-native audiences this resonates with",
  "launchStyle": "one of: fair-launch | hype-raid | stealth | community-led",
  "reasoning": "1-2 sentences on why this concept fits X right now",
  "originXUrl": "https://x.com/<handle>/status/<id>  OR  null",
  "originXAuthor": "@handle  OR  null"
}`;

  // Inject a tiny salt so the model doesn't keep returning the same concept.
  const salt = Math.random().toString(36).slice(2, 8);
  const user = `Generate ONE memecoin launch concept right now. Variety matters — pick something I couldn't have come up with alone. Avoid generic AI/cat/dog defaults unless you have a specific, fresh angle. Anchor it to a memorable visual hook.

Output JSON only. (request_id: ${salt})`;

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
