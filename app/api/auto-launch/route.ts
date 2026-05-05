import { NextResponse, type NextRequest } from "next/server";
import { callLLM, getActiveProvider } from "@/lib/llm/router";
import {
  buildAutoConceptMessages,
  parseAutoConcept,
  type AutoConceptResult,
} from "@/lib/llm/promptAutoConcept";

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

    // 30-day window keeps results recent — meme-coin attention cycles are
    // measured in hours, so anything older isn't actionable.
    const today = new Date();
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
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
              fromDate: isoDate(monthAgo),
              toDate: isoDate(today),
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
