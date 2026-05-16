import { NextResponse, type NextRequest } from "next/server";
import { callLLM, getActiveProvider } from "@/lib/llm/router";
import {
  buildAutoConceptMessages,
  parseAutoConcept,
  type AutoConceptResult,
} from "@/lib/llm/promptAutoConcept";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Per-call live x_search. Every Auto-pilot invocation asks Grok to do its
// OWN fresh X search and pick a viral post that hasn't been used by any
// previous KOKi launch — strict deduplication across all wallets.
//
// Why per-call (and not a shared cache): 1000 concurrent users splitting a
// 14-meme pool means most users get duplicates. With per-call search +
// exclude_x_urls, every user gets something genuinely fresh.
//
// The shared cache (cron-warmed `cached_memes`) still exists but is used
// ONLY as a safety net fallback — if Grok's per-call search comes back
// empty or fails, we'd rather hand the user a cached pick than crash.
export const maxDuration = 180;
export const runtime = "nodejs";

/** How many recent launches to look back when building the exclude list.
 *  100 = roughly the last ~3-7 days of KOKi launches at expected volume.
 *  Tradeoff: bigger = stricter dedup, larger prompt. Grok-4 handles 100+
 *  URLs in a system message without trouble. */
const RECENT_LAUNCHES_FOR_EXCLUDE = 200;

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

  // Build the exclude list BEFORE the LLM call so it goes into the
  // system prompt verbatim. Every URL here is guaranteed to be a real
  // X post (we wrote it ourselves on a previous successful launch).
  const excludeXUrls = await fetchUsedSourceXUrls();

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

    // 48-HOUR window. The user explicitly wants the FRESHEST viral content
    // ("최신 소식, 조회수 엄청 많고 반응 핫한"), so a wide 14-day window pulls
    // back posts that already peaked days ago. 48 hours forces Grok to dig
    // into right-now-trending content.
    const today = new Date();
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const llmRes = await callLLM({
      messages: buildAutoConceptMessages({ excludeXUrls: excludeXUrls }),
      responseFormat: "json",
      maxTokens: 800,
      temperature: 0.95, // higher = more variety so we don't keep getting the same idea
      model: searchModel,
      feature: "auto-launch",
      walletPubkey,
      // ALWAYS attach Live Search — the whole point of Auto-pilot is that
      // Grok scans X in real time and the picked post is genuinely fresh.
      // We keep the env override for emergencies (xAI outage), but the
      // default is now ON.
      ...(wantLiveSearch || true
        ? {
            liveSearch: {
              fromDate: isoDate(twoDaysAgo),
              toDate: isoDate(today),
              maxResults: 30, // bigger pool = better odds of clearing the engagement floor
              enableImageUnderstanding: true,
            },
          }
        : {}),
    });

    const concept = parseAutoConcept(llmRes.content);

    // Hard dedup check — if Grok ignored the exclude list and re-picked a
    // URL that's already in launches_v1, refuse to anchor on it. Drop the
    // X attribution; the wizard will use a safe ticker-search Pump.fun URL
    // as the token's Twitter link instead. Better an unattributed launch
    // than a duplicate.
    const excludeSet = new Set(excludeXUrls);
    if (concept.originXUrl && excludeSet.has(concept.originXUrl)) {
      console.warn(
        `[auto-launch] Grok returned an excluded URL (${concept.originXUrl}) — dropping attribution`,
      );
      concept.originXUrl = undefined;
      concept.originXAuthor = undefined;
      concept.originImageUrl = undefined;
    }

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

// ── Dedup helper ───────────────────────────────────────────────────────

/**
 * Pull the X-post URLs that previous KOKi launches have already anchored on.
 * Newest-first, capped at RECENT_LAUNCHES_FOR_EXCLUDE. Empty array when
 * Supabase isn't configured (dev) — in that case dedup is best-effort and
 * the LLM is the only gate.
 *
 * NULLs are skipped because the legacy launches table is brand-new with
 * source_x_url and most pre-migration rows haven't been backfilled.
 */
async function fetchUsedSourceXUrls(): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("launches_v1")
      .select("source_x_url")
      .not("source_x_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(RECENT_LAUNCHES_FOR_EXCLUDE);
    if (error || !data) return [];
    return (data as Array<{ source_x_url: string | null }>)
      .map((r) => r.source_x_url)
      .filter((u): u is string => typeof u === "string" && u.length > 0);
  } catch {
    return [];
  }
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
