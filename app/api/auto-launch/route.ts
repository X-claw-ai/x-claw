import { NextResponse, type NextRequest } from "next/server";
import { callLLM, getActiveProvider } from "@/lib/llm/router";
import {
  buildAutoConceptMessages,
  parseAutoConcept,
  type AutoConceptResult,
} from "@/lib/llm/promptAutoConcept";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Auto-pilot has two paths:
//   1. FAST PATH (default) — read pre-warmed memes from public.cached_memes
//      (refreshed every 30min by /api/cron/refresh-memes). Call Grok with
//      that pool + ask it to pick + draft a concept. End-to-end ~10s.
//   2. LIVE PATH (fallback) — if cache is empty or expired (e.g. first
//      deploy, cron hasn't run yet), fall back to live x_search. That's
//      the old 30-90s call. The 180s ceiling stays for this safety net.
export const maxDuration = 180;
export const runtime = "nodejs";

interface AutoLaunchResponse {
  ok: boolean;
  concept?: AutoConceptResult;
  provider?: string;
  model?: string;
  fallbackReason?: string;
  error?: string;
  /** Debug: did we ASK xAI to do Live Search this call? */
  liveSearchRequested?: boolean;
  /** Debug: citation URLs xAI returned (empty array = search likely no-op'd). */
  citations?: string[];
  /** Debug: env-var introspection so we can tell why liveSearchRequested is false. */
  debug?: {
    /** Lowercased & trimmed XAI_LIVE_SEARCH value. Empty string = env not set. */
    liveSearchEnvRaw: string;
    hasXaiKey: boolean;
    /** Providers that failed before the one that answered, with errors. */
    providerAttempts?: { provider: string; error: string }[];
    /**
     * Set when xAI accepted the bare request but rejected search_parameters.
     * The status + error text reveal exactly why Live Search isn't running
     * (e.g. "Live Search requires a Pro tier" / "model does not support search").
     */
    xaiSearchRejection?: { status: number; error: string };
  };
}

/**
 * POST /api/auto-launch
 *
 * Asks Grok (with Anthropic / OpenAI fallback) to invent a complete memecoin
 * concept on the spot. Returns a ConceptInput-shaped JSON the wizard can
 * paste straight into its form, then immediately generate the launch kit.
 *
 * Body (optional):
 *   { walletPubkey?: string }   — for usage tracking only
 */
export async function POST(req: NextRequest) {
  let walletPubkey: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { walletPubkey?: string };
    walletPubkey = body.walletPubkey;
  } catch {
    /* body is optional */
  }

  const active = getActiveProvider();

  // Path A: no provider configured → deterministic fallback concept
  if (!active) {
    return NextResponse.json<AutoLaunchResponse>({
      ok: true,
      concept: fallbackConcept(),
      provider: "mock",
      model: "deterministic",
      fallbackReason: "no LLM provider configured (set XAI_API_KEY)",
    });
  }

  // ── FAST PATH: pre-warmed meme cache ─────────────────────────────────
  // /api/cron/refresh-memes already paid the 30-90s x_search cost. Read
  // the freshest rows and ask Grok to pick + draft a concept (5-10s, no
  // search tool needed since the source posts are already on the table).
  const cached = await readCachedMemes();
  if (cached.length > 0) {
    try {
      const concept = await buildConceptFromCache(cached, walletPubkey);
      return NextResponse.json<AutoLaunchResponse>({
        ok: true,
        concept,
        provider: "xai-cache",
        model: "grok-4.3",
        liveSearchRequested: false,
        citations: cached.map((m) => m.x_url),
        debug: {
          liveSearchEnvRaw: "cache",
          hasXaiKey: Boolean(process.env.XAI_API_KEY),
          providerAttempts: [],
        },
      });
    } catch (err) {
      console.warn(
        `[auto-launch] cache path failed → live fallback: ${(err as Error).message}`,
      );
      // fall through to live x_search below
    }
  }

  try {
    // X Search via Agent Tools API (replaced deprecated `search_parameters`).
    // Default OFF for the same reason — not every xAI account/model supports
    // it, and a 4xx here triggers a fallback to OpenAI which can't search X.
    // Opt-in via XAI_LIVE_SEARCH env. Lenient parsing: any truthy variant
    // ("on" / "true" / "1" / "yes") enables it.
    const liveRaw = (process.env.XAI_LIVE_SEARCH || "").trim().toLowerCase();
    const wantLiveSearch = ["on", "true", "1", "yes", "y", "enable", "enabled"].includes(liveRaw);

    // X Search requires an Agent-Tools-capable model. Per xAI docs the
    // canonical search-enabled model is `grok-4.3`. Default to that for
    // auto-concept calls so X Search actually fires. Operators can override
    // via XAI_MODEL_AUTO_CONCEPT for testing.
    const searchModel = process.env.XAI_MODEL_AUTO_CONCEPT || "grok-4.3";

    // 14-day window balances freshness vs result depth. Pro plan gives us
    // 300s of function time so we can afford a richer search than the
    // 7-day/5-result minimum we'd squeeze into Hobby's 60s ceiling.
    const today = new Date();
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const llmRes = await callLLM({
      messages: buildAutoConceptMessages(),
      responseFormat: "json",
      maxTokens: 800,
      temperature: 0.95, // higher = more variety so we don't keep getting the same idea
      model: searchModel,
      feature: "auto-launch",
      walletPubkey,
      ...(wantLiveSearch
        ? {
            liveSearch: {
              fromDate: isoDate(twoWeeksAgo),
              toDate: isoDate(today),
              maxResults: 10,
              enableImageUnderstanding: true,
            },
          }
        : {}),
    });

    const concept = parseAutoConcept(llmRes.content);

    // If the model forgot to populate originXUrl in JSON but a citation is
    // present, take the first citation that looks like a real X status URL.
    if (!concept.originXUrl && llmRes.citations) {
      const citation = llmRes.citations.find((c) =>
        /^https?:\/\/(?:x\.com|twitter\.com)\/[^/\s]+\/status\/\d+/.test(c),
      );
      if (citation) {
        concept.originXUrl = citation.replace("twitter.com", "x.com");
        const m = citation.match(/(?:x\.com|twitter\.com)\/([^/\s]+)\/status\//);
        if (m && !concept.originXAuthor) concept.originXAuthor = `@${m[1]}`;
      }
    }

    // Safety net: if the cited X post body looks like a token-shill (CA,
    // contract, pump.fun link, dexscreener, base58 mint address, "$TICKER"
    // mentions, "fair launch live"), the post probably already has its own
    // coin and our token's Twitter button would point at that coin's
    // promo — bad look. Drop the originXUrl in that case so the token
    // falls back to the safe ticker-search URL on Pump.fun.
    //
    // We only see what the model wrote in `idea` / `reasoning` though, not
    // the post body itself — so check those fields and the URL itself for
    // the shill signal. Conservative: when in doubt, drop the link.
    const shillSignal = /\b(?:CA|contract)\s*[:=]?\s*[1-9A-HJ-NP-Za-km-z]{32,}|pump\.fun\/coin|dexscreener|0x[0-9a-f]{40}|fair\s*launch\s*live|sending\s+it\s+now|buy\s+now\s+\$[A-Z]{2,8}/i;
    const ideaBlob = `${concept.idea} ${concept.reasoning} ${concept.originXUrl ?? ""}`;
    if (concept.originXUrl && shillSignal.test(ideaBlob)) {
      console.warn(
        `[auto-launch] dropping originXUrl — looks like a token-shill post: ${concept.originXUrl}`,
      );
      concept.originXUrl = undefined;
      concept.originXAuthor = undefined;
      concept.originImageUrl = undefined;
    }

    return NextResponse.json<AutoLaunchResponse>({
      ok: true,
      concept,
      provider: llmRes.provider,
      model: llmRes.model,
      liveSearchRequested: wantLiveSearch,
      citations: llmRes.citations ?? [],
      // Debug: surface the raw env value (lowercased & trimmed) + which
      // providers failed before the one that actually answered. Lets us
      // see things like "xai threw 'API error 400: search not available'"
      // without spelunking through Vercel function logs.
      debug: {
        liveSearchEnvRaw: liveRaw,
        hasXaiKey: Boolean(process.env.XAI_API_KEY),
        providerAttempts: llmRes.previousAttempts ?? [],
        xaiSearchRejection: llmRes.searchRejection,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[auto-launch] LLM call failed → falling back: ${msg}`);
    return NextResponse.json<AutoLaunchResponse>({
      ok: true,
      concept: fallbackConcept(),
      provider: "mock",
      model: "deterministic-fallback",
      fallbackReason: msg,
    });
  }
}

// ── Cache helpers ──────────────────────────────────────────────────────

interface CachedMeme {
  x_url: string;
  x_author: string;
  image_url: string | null;
  summary: string;
  meme_angle: string | null;
  engagement_score: number | null;
}

/** Read the freshest cached memes from Supabase. Empty array = cache miss. */
async function readCachedMemes(): Promise<CachedMeme[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cached_memes")
      .select("x_url, x_author, image_url, summary, meme_angle, engagement_score")
      .gt("expires_at", new Date().toISOString())
      .order("engagement_score", { ascending: false, nullsFirst: false })
      .limit(20);
    if (error || !data) return [];
    return data as CachedMeme[];
  } catch {
    return [];
  }
}

/**
 * Ask Grok to pick the strongest meme from the cached pool and draft a full
 * memecoin concept around it. No x_search call — the candidate posts are
 * already on the table, so this completes in 5-10s vs. 30-90s for live.
 */
async function buildConceptFromCache(
  pool: CachedMeme[],
  walletPubkey: string | undefined,
): Promise<AutoConceptResult> {
  const candidates = pool
    .map(
      (m, i) =>
        `${i + 1}. ${m.x_author}\n   URL: ${m.x_url}\n   Image: ${m.image_url ?? "none"}\n   Summary: ${m.summary}\n   Angle: ${m.meme_angle ?? "n/a"}`,
    )
    .join("\n\n");

  const system = `You are KOKi, the Grok-native meme coin launch agent. You'll be handed a curated list of viral X posts (already filtered for shill content and organic appeal). PICK the single strongest one and build a memecoin concept around it.

Hard rules:
- Safe and inoffensive. No real-person names. No politics. No copyrighted IP. No "guaranteed", "100x", "moon", "to-the-moon", or pump-promise language.
- No partnership claims with X / xAI / Grok / Pump.fun / Solana — use "X-native" / "Solana-native" framing instead.
- Ticker: 3-6 uppercase letters/numbers, memorable, NOT a real major ticker.
- originXUrl + originXAuthor + originImageUrl MUST be copied verbatim from the candidate you picked. Never fabricate.
- Output STRICT JSON ONLY. No markdown fences. No commentary outside JSON.

Output schema:
{
  "idea": "1-2 sentence pitch of the token's narrative",
  "tokenName": "TitleCase or single word — specific, not generic",
  "ticker": "3-6 uppercase chars",
  "theme": "short visual/narrative theme",
  "audience": "the 2-3 X-native audiences this resonates with",
  "launchStyle": "one of: fair-launch | hype-raid | stealth | community-led",
  "reasoning": "1-2 sentences on why this concept fits X right now",
  "originXUrl": "<copied from chosen candidate>",
  "originXAuthor": "<copied from chosen candidate>",
  "originImageUrl": "<copied from chosen candidate, or null>"
}`;

  const salt = Math.random().toString(36).slice(2, 8);
  const user = `Pick ONE of these viral X posts and build a memecoin concept on top of it. Variety matters — go for the post that's most visually memorable, not the safest.\n\nCANDIDATES:\n\n${candidates}\n\nOutput JSON only. (request_id: ${salt})`;

  const llmRes = await callLLM({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    responseFormat: "json",
    maxTokens: 600,
    temperature: 0.9,
    model: "grok-4.3",
    feature: "auto-launch-cache",
    walletPubkey,
  });

  const concept = parseAutoConcept(llmRes.content);

  // Defensive: re-validate that the picked URLs actually exist in the pool we
  // showed the model. If Grok hallucinated, fall back to the highest-ranked
  // candidate's URLs.
  const urlSet = new Set(pool.map((m) => m.x_url));
  if (concept.originXUrl && !urlSet.has(concept.originXUrl)) {
    const top = pool[0];
    concept.originXUrl = top.x_url;
    concept.originXAuthor = top.x_author;
    concept.originImageUrl = top.image_url ?? undefined;
  }

  return concept;
}

/** Deterministic, X-native concept used when LLM is unavailable. */
function fallbackConcept(): AutoConceptResult {
  return {
    idea: "Grok-native meme cat that watches X timelines 24/7. The patron saint of the AI agent era.",
    tokenName: "Grok Cat",
    ticker: "GROKCAT",
    theme: "AI cat archetype · neon-on-dark · X-native posting energy",
    audience: "AI-curious crypto natives, Grok power users, cat-meme posters",
    launchStyle: "hype-raid",
    reasoning:
      "Cat memes are perennially X-native; the AI-agent overlay matches the cultural moment without overclaiming.",
  };
}
