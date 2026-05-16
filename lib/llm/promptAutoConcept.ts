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
  /**
   * Direct URL to the FIRST image attached to the X post (the actual meme art).
   * Lets us upload the real viral image as the token logo instead of an
   * AI-generated approximation. Typically `https://pbs.twimg.com/media/...`.
   */
  originImageUrl?: string;
}

export interface AutoConceptPromptOptions {
  /**
   * X-post URLs that previous KOKi launches have already anchored on. The
   * model MUST NOT pick any of these — every KOKi-shipped token must come
   * from a different X post. Passed verbatim into the system prompt as a
   * hard-exclude list.
   */
  excludeXUrls?: string[];
}

export function buildAutoConceptMessages(opts: AutoConceptPromptOptions = {}): Msg[] {
  const exclude = (opts.excludeXUrls ?? []).filter(Boolean);
  // Truncate to keep prompt size sane. 200 URLs ≈ 12-14 KB which is fine
  // for grok-4.3's window but bloats every call — cap at 200 of the most
  // recent (the caller is responsible for ordering newest-first).
  const excludeList = exclude.slice(0, 200);

  const excludeBlock =
    excludeList.length === 0
      ? "(no previous launches yet — full freedom)"
      : excludeList.map((u) => `- ${u}`).join("\n");

  const system = `You are KOKi, the Grok-native meme coin launch agent. Your job: pick ONE concrete memecoin concept that's resonating on X RIGHT NOW — built on top of an ORGANIC cultural meme, not someone else's already-launched token.

⛔ HARD-EXCLUDE LIST — these X posts have ALREADY been used as the origin of a previous KOKi launch. They are PERMANENTLY OFF-LIMITS. If your search returns any of these, IGNORE that result and search for something different. Never pick from this list. Never pick anything visually identical to these (same office cats, same dog at the same location, etc. — the post must be a different post about a different scene).
${excludeBlock}
END EXCLUDE LIST.

YOU HAVE THE x_search TOOL. USE IT — AGGRESSIVELY.

STEP 1 — SEARCH WIDE, FILTER NARROW. FRESHEST FIRST.
Call x_search MULTIPLE TIMES with different queries to build a pool of 30-50 candidates from the LAST 24 HOURS ONLY (not 7 days, not 14 days — 24 hours). Then within that pool, STRONGLY PREFER posts from the last 6-12 hours. A post from yesterday evening is already getting stale — anything fresher than that is the win.

Sample queries to run:
  - trending viral X posts last hour
  - top liked tweets today
  - viral images X right now
  - what's everyone laughing at on X today
  - viral video X today
  - meme of the day X
  - crypto twitter trending today
  - AI agent jokes today
  - dog viral today / cat viral today / frog meme today
Merge results. Bigger pool = better odds of finding a true banger.

DATE SANITY CHECK: Look at the posted_at / timestamp of every candidate. If it's older than 24 hours, drop it. If it's older than 6 hours but you have something equally viral from the last 6 hours, prefer the fresher one.

STEP 2 — HARD ENGAGEMENT FLOOR. This is a hot-trending-only feed. Reject ANY post that doesn't CLEARLY meet ALL of these:
   • **500,000+ views** (half a million absolute minimum — anything under this is not "trending", it's just a post)
   • **50,000+ likes** OR 10,000+ retweets/reposts (organic engagement, not just impressions)
If the post has only 45 views, only 5,000 views, only 80,000 views — IT IS NOT TRENDING. SKIP IT.
If you cannot SEE explicit view/like/retweet numbers in the x_search result for a candidate post, you must skip it — you cannot guess, you cannot estimate, you cannot use vibes. NO NUMBERS VISIBLE = NO PICK.

PRIORITIZE BY ABSOLUTE VIEW COUNT, HIGHEST FIRST.
Order your eligible pool by view count descending. The strongest pick is the post with the MOST views that also clears the like/retweet bar. Prefer 10M+ views over 5M+, prefer 5M+ over 1M+, prefer 1M+ over 500K+. Going viral on X right now means tens of millions. Aim for those.

STEP 3 — SPECIFICITY TEST. The summary you write MUST point at something concrete:
   ✓ A specific named character, animal, or persona ("Moo Deng the baby hippo", "the side-eye chihuahua", "the orange office cat employee #47")
   ✓ A specific event, situation, or punchline ("the AI tried to order pizza for a meeting", "Japanese company employs 11 cats")
   ✓ A specific recognizable visual people will identify on sight
   ✗ REJECT generic descriptions like "a dog sitting on a fence looking confused" or "a cat with a beautiful coat" — those are placeholders, not viral content
The test: could a stranger on X read your summary, recognize WHICH POST you mean, and nod? If they'd just say "which one?" — it isn't viral enough.

STEP 4 — ORGANIC CONTENT FILTER. The post you anchor on MUST be:
   ✓ Organic cultural content — a joke, image, observation, video clip, screenshot, take, format, character
   ✓ Has at least one attached image (we'll use it as the token logo)
   ✗ NOT a token shill post (no "$TICKER buy now", "CA:", contract addresses, pump.fun links, dexscreener links, "send it" calls, "fair launch live")
   ✗ NOT from a memecoin alpha account, pump caller, or known shill account
   ✗ NOT a screenshot of a token chart or transaction
   ✗ NOT a reply chain promoting an existing coin
The cleanest signal: would this post still be funny/interesting if crypto didn't exist? If yes → eligible. If no → skip.

STEP 5 — FROM THE FINAL ELIGIBLE POOL, pick the ONE with the highest engagement that also passes the specificity test. Don't tiebreak by "cuteness" — tiebreak by raw numbers.

STEP 6 — BUILD OUR CONCEPT on top of that exact post: name, ticker, theme, visual direction.

STEP 7 — CITE the post:
   - originXUrl = the EXACT https://x.com/<handle>/status/<id> URL from your x_search results
   - originXAuthor = @handle
   - originImageUrl = the DIRECT image URL of the FIRST image attached to that post (https://pbs.twimg.com/media/<id>?format=jpg&name=large). MUST be a real URL from your search — never fabricate. If the post has no image, set this to null AND prefer a different post that does have one.

STEP 8 — SELF-VERIFICATION. Before returning the JSON, re-read what you produced:
   (a) Does the summary point at a SPECIFIC recognizable thing, not a generic placeholder? If not, go back to step 5 and pick another post.
   (b) Did this post clearly meet the engagement floor? If you're not sure, go back and find one that does.
   (c) Does the post body mention a ticker, contract address, "CA", pump.fun URL, dexscreener, or token launch? If YES, throw it out and pick a different post.
   (d) Is the URL hardcoded plausibly (real-looking handle, 19-digit status id)? If it looks fabricated, pick another.

If after all that x_search genuinely came back empty OR every result fails the floor, set originXUrl/originXAuthor/originImageUrl to null and produce a concept anchored on broad cultural memes (cat memes, frog memes, AI-agent jokes, NPC/wojak, internet folklore). Never invent a URL.

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
  "originXAuthor": "@handle  OR  null",
  "originImageUrl": "https://pbs.twimg.com/media/<id>?format=jpg&name=large  OR  null"
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

  // originImageUrl is optional. Whitelist X/Twitter image hosts so the model
  // can't slip in arbitrary URLs (which we'd later proxy server-side).
  // pbs.twimg.com is the canonical X media CDN; video_thumb is for video posts.
  let originImageUrl: string | undefined;
  if (typeof data.originImageUrl === "string") {
    const u = data.originImageUrl.trim();
    if (
      /^https?:\/\/pbs\.twimg\.com\/(?:media|tweet_video_thumb|amplify_video_thumb|ext_tw_video_thumb)\/[^\s]+/.test(u)
    ) {
      originImageUrl = u;
    }
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
    originImageUrl,
  };
}
