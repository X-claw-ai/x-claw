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
    const llmRes = await callLLM({
      messages: buildAutoConceptMessages(),
      responseFormat: "json",
      maxTokens: 600,
      temperature: 0.95,
      model: "fast",
      feature: "auto-launch",
      walletPubkey,
    });

    const concept = parseAutoConcept(llmRes.content);

    return NextResponse.json<AutoLaunchResponse>({
      ok: true,
      concept,
      provider: llmRes.provider,
      model: llmRes.model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // On parse / network failure, return a deterministic fallback so the
    // user still gets a usable concept and can retry from the UI.
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
