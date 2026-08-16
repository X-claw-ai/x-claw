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
// previous HAMR launch, strict deduplication across all wallets.
//
// Why per-call (and not a shared cache): 1000 concurrent users splitting a
// 14-meme pool means most users get duplicates. With per-call search +
// exclude_x_urls, every user gets something genuinely fresh.
//
// The shared cache (cron-warmed `cached_memes`) still exists but is used
// ONLY as a safety net fallback, if Grok's per-call search comes back
// empty or fails, we'd rather hand the user a cached pick than crash.
export const maxDuration = 180;
export const runtime = "nodejs";

/** How many recent launches to look back when building the exclude list.
 *  100 = roughly the last ~3-7 days of HAMR launches at expected volume.
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
 *   { walletPubkey?: string }  , for usage tracking only
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
  // system prompt verbatim. UNION of: already-launched URLs (permanent
  // exclusion) and reserved URLs (30-min TTL, a concurrent Auto-pilot
  // call just picked this and hasn't finished signing yet).
  const excludeXUrls = await fetchUnavailableXUrls();

  try {
    // X Search via Agent Tools API (replaced deprecated `search_parameters`).
    // Default OFF for the same reason, not every xAI account/model supports
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

    // 24-HOUR window. The user kept catching "yesterday evening" posts
    // in the 48h window, too stale. Tighten to last 24h and let the
    // system prompt push toward the last 6-12h when results are dense
    // enough. xAI's `from_date` is day-granular so we always pass
    // yesterday-or-newer here; the FRESHNESS bias is enforced by the
    // prompt itself.
    const today = new Date();
    const oneDayAgo = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);

    const makeConceptCall = (exclude: string[]) =>
      callLLM({
        messages: buildAutoConceptMessages({ excludeXUrls: exclude }),
        responseFormat: "json",
        // 1500 (was 800) to give Grok room to emit the full JSON shape after
        // walking 30-50 candidates through the priority order. Truncated JSON
        // = parseAutoConcept throws = mock fallback. Reproduced once in prod.
        maxTokens: 1500,
        temperature: 0.95, // higher = more variety so we don't keep getting the same idea
        model: searchModel,
        feature: "auto-launch",
        walletPubkey,
        // ALWAYS attach Live Search, the whole point of Auto-pilot is that
        // Grok scans X in real time and the picked post is genuinely fresh.
        // We keep the env override for emergencies (xAI outage), but the
        // default is now ON.
        ...(wantLiveSearch || true
          ? {
              liveSearch: {
                fromDate: isoDate(oneDayAgo),
                toDate: isoDate(today),
                maxResults: 40, // bigger pool, most candidates will fail the 500K-view floor
                enableImageUnderstanding: true,
              },
            }
          : {}),
      });

    let llmRes = await makeConceptCall(excludeXUrls);

    const parseOrLog = (content: string): AutoConceptResult => {
      try {
        return parseAutoConcept(content);
      } catch (parseErr) {
        // Surface the actual Grok output so we can see WHY parse failed
        // (truncated? prose explanation? missing fields?). Without this log
        // the 200-with-mock looked like a successful run from outside.
        console.error(
          `[auto-launch] parseAutoConcept failed: ${(parseErr as Error).message}\nraw Grok content (first 1500 chars):\n${(content || "").slice(0, 1500)}`,
        );
        throw parseErr;
      }
    };

    let concept = parseOrLog(llmRes.content);

    // Hard dedup check — if Grok ignored the exclude list and re-picked a
    // URL that's already taken (launched OR reserved), RETRY ONCE with the
    // offending URL added to the exclude list. The old behavior (strip the
    // attribution but keep the concept) meant users saw the SAME meme again
    // — now with no image and no link, the worst of both worlds. A retry
    // costs one more LLM round-trip but actually delivers a fresh post.
    const excludeSet = new Set(excludeXUrls);
    if (concept.originXUrl && excludeSet.has(concept.originXUrl)) {
      console.warn(
        `[auto-launch] Grok returned an excluded URL (${concept.originXUrl}) — retrying once with it force-excluded`,
      );
      try {
        const retryRes = await makeConceptCall([
          ...excludeXUrls,
          concept.originXUrl,
        ]);
        const retryConcept = parseOrLog(retryRes.content);
        if (
          retryConcept.originXUrl &&
          !excludeSet.has(retryConcept.originXUrl) &&
          retryConcept.originXUrl !== concept.originXUrl
        ) {
          llmRes = retryRes;
          concept = retryConcept;
        } else {
          // Retry still collided (or came back unattributed) — fall back to
          // the stripped-attribution behavior rather than a third call.
          concept.originXUrl = undefined;
          concept.originXAuthor = undefined;
          concept.originImageUrl = undefined;
        }
      } catch {
        concept.originXUrl = undefined;
        concept.originXAuthor = undefined;
        concept.originImageUrl = undefined;
      }
    }

    // Reserve the URL IMMEDIATELY so the next concurrent caller (within
    // the next 30 minutes) won't see it as available. The reservation is
    // fire-and-forget, we don't await it before returning the response.
    // If the user completes their launch, /api/launches POST writes the
    // URL into pons_launches (permanent). If they abandon, the 30-min TTL
    // sweeps it.
    if (concept.originXUrl) {
      void reserveXUrl(concept.originXUrl, walletPubkey);
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
    // contract, pons.family / pump.fun / uniswap link, dexscreener, EVM
    // address, "$TICKER" mentions, "fair launch live"), the post probably
    // already has its own coin and our token's Twitter button would point
    // at that coin's promo, bad look. Drop the originXUrl in that case so
    // the token falls back to the safe ticker-search URL on Pons.
    //
    // We only see what the model wrote in `idea` / `reasoning` though, not
    // the post body itself, so check those fields and the URL itself for
    // the shill signal. Conservative: when in doubt, drop the link.
    const shillSignal = /\b(?:CA|contract)\s*[:=]?\s*[1-9A-HJ-NP-Za-km-z]{32,}|pump\.fun\/coin|dexscreener|0x[0-9a-f]{40}|fair\s*launch\s*live|sending\s+it\s+now|buy\s+now\s+\$[A-Z]{2,8}/i;
    const ideaBlob = `${concept.idea} ${concept.reasoning} ${concept.originXUrl ?? ""}`;
    if (concept.originXUrl && shillSignal.test(ideaBlob)) {
      console.warn(
        `[auto-launch] dropping originXUrl, looks like a token-shill post: ${concept.originXUrl}`,
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
 * Pull X-post URLs that are off-limits for the next Auto-pilot pick. This is
 * the UNION of two tables:
 *
 *   1. pons_launches.source_x_url, posts that previous launches already
 *      anchored on. PERMANENT exclusion (a token is a token).
 *
 *   2. reserved_x_urls (expires_at > now()), posts that another concurrent
 *      Auto-pilot call has just picked but hasn't been signed-and-launched
 *      yet. SHORT-TERM exclusion (30 min TTL). Solves the race condition
 *      where 20 users hit /api/auto-launch in the same second and Grok
 *      hands them all the same hot post.
 *
 * Newest-first within each pool, capped at RECENT_LAUNCHES_FOR_EXCLUDE total
 * to keep the prompt size sane. Empty array when Supabase isn't configured
 * (dev), in that case dedup is best-effort and the LLM is the only gate.
 */
async function fetchUnavailableXUrls(): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];

  // Run the two queries in parallel, they don't depend on each other.
  const [launchedRes, reservedRes] = await Promise.all([
    sb
      .from("pons_launches")
      .select("source_x_url")
      .not("source_x_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(RECENT_LAUNCHES_FOR_EXCLUDE),
    sb
      .from("reserved_x_urls")
      .select("x_url")
      .gt("expires_at", new Date().toISOString())
      .order("reserved_at", { ascending: false })
      .limit(RECENT_LAUNCHES_FOR_EXCLUDE),
  ]);

  const out = new Set<string>();
  if (!launchedRes.error && launchedRes.data) {
    for (const r of launchedRes.data as Array<{ source_x_url: string | null }>) {
      if (typeof r.source_x_url === "string" && r.source_x_url.length > 0) {
        out.add(r.source_x_url);
      }
    }
  }
  if (!reservedRes.error && reservedRes.data) {
    for (const r of reservedRes.data as Array<{ x_url: string | null }>) {
      if (typeof r.x_url === "string" && r.x_url.length > 0) {
        out.add(r.x_url);
      }
    }
  }

  // Newest entries first is preferable for prompt-size truncation, so emit
  // reserved (very recent) before launched (older). Both pools are already
  // ordered newest-first within themselves, so a stable iteration order
  // mostly preserves that.
  return Array.from(out);
}

/**
 * Reserve an X-post URL so concurrent Auto-pilot calls can't anchor on it
 * before the user finishes signing. 30-minute TTL; if the launch doesn't
 * complete in time, the reservation naturally expires.
 *
 * Idempotent via ON CONFLICT, if the URL is already reserved (race we
 * couldn't prevent), the upsert just refreshes the timestamp. The DB
 * primary key prevents two different users from both 'owning' the same
 * reservation row.
 *
 * Fire-and-forget: failure here doesn't break the user's launch flow,
 * it just means concurrent users might pick the same post. The
 * post-LLM excludeSet check on the next caller will still catch
 * duplicates once pons_launches has the row.
 */
async function reserveXUrl(xUrl: string, walletPubkey: string | undefined): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  try {
    await sb
      .from("reserved_x_urls")
      .upsert(
        {
          x_url: xUrl,
          wallet_address: walletPubkey ?? null,
          reserved_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        { onConflict: "x_url", ignoreDuplicates: false },
      );
  } catch {
    /* best-effort, don't block the user response on a reservation failure */
  }
}

/** Deterministic, X native concept used when LLM is unavailable. */
function fallbackConcept(): AutoConceptResult {
  return {
    idea: "Grok native meme cat that watches X timelines 24/7. The patron saint of the AI agent era.",
    tokenName: "Grok Cat",
    ticker: "GROKCAT",
    theme: "AI cat archetype, neon-on-dark, X native posting energy",
    audience: "AI curious crypto natives, Grok power users, cat-meme posters",
    launchStyle: "hype-raid",
    reasoning:
      "Cat memes are perennially X native; the AI agent overlay matches the cultural moment without overclaiming.",
  };
}
