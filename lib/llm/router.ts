import type { LLMRequest, LLMResponse, Provider } from "./types";
import { callXAI } from "./xai";
import { callAnthropic } from "./anthropic";
import { callOpenAI } from "./openai";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────
// KOKi LLM router
//
// Provider order is FIXED for product positioning reasons:
//   1. xAI Grok (primary)         — what "Grok-first" means in practice
//   2. Anthropic Claude (fallback)
//   3. OpenAI (last resort)
//
// If a provider's key isn't set, we skip it. If a provider call throws,
// we move to the next one. The user-facing UI shows which provider
// actually served the response, so we never lie about what's running.
// ─────────────────────────────────────────────────────────────────────────

const ORDER: Provider[] = ["xai", "anthropic", "openai"];

const ENV_KEY: Record<Exclude<Provider, "mock">, string> = {
  xai: "XAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

const CALLERS: Record<
  Exclude<Provider, "mock">,
  (req: LLMRequest) => Promise<LLMResponse>
> = {
  xai: callXAI,
  anthropic: callAnthropic,
  openai: callOpenAI,
};

/** Returns the highest-priority provider that has a key configured. */
export function getActiveProvider(): Provider | null {
  for (const p of ORDER) {
    if (process.env[ENV_KEY[p as Exclude<Provider, "mock">]]) return p;
  }
  return null;
}

/** Returns every provider that's currently usable. Useful for diagnostics. */
export function listAvailableProviders(): Provider[] {
  return ORDER.filter((p) =>
    Boolean(process.env[ENV_KEY[p as Exclude<Provider, "mock">]])
  );
}

export class LLMRouterError extends Error {
  attempts: { provider: Provider; error: string }[];
  constructor(
    message: string,
    attempts: { provider: Provider; error: string }[]
  ) {
    super(message);
    this.attempts = attempts;
  }
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const attempts: { provider: Provider; error: string }[] = [];
  const startedAt = Date.now();

  for (const p of ORDER) {
    const k = ENV_KEY[p as Exclude<Provider, "mock">];
    if (!process.env[k]) continue;
    try {
      const res = await CALLERS[p as Exclude<Provider, "mock">](req);
      logUsage({
        provider: res.provider,
        model: res.model,
        feature: req.feature ?? "unknown",
        inputTokens: res.usage?.input,
        outputTokens: res.usage?.output,
        durationMs: Date.now() - startedAt,
        walletPubkey: req.walletPubkey,
        fallbackReason: attempts.length > 0 ? attempts.map((a) => a.provider).join("→") : undefined,
      });
      return res;
    } catch (err: unknown) {
      attempts.push({
        provider: p,
        error: err instanceof Error ? err.message : String(err),
      });
      // continue to next provider
    }
  }

  if (attempts.length === 0) {
    throw new LLMRouterError(
      "No LLM provider configured. Set XAI_API_KEY (recommended), or ANTHROPIC_API_KEY / OPENAI_API_KEY as fallbacks.",
      attempts
    );
  }
  throw new LLMRouterError(
    `All configured LLM providers failed. Tried: ${attempts
      .map((a) => a.provider)
      .join(", ")}`,
    attempts
  );
}

/** Best-effort usage logging to Supabase. Never throws. */
function logUsage(row: {
  provider: Provider;
  model: string;
  feature: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  walletPubkey?: string;
  fallbackReason?: string;
}) {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  void sb
    .from("llm_usage")
    .insert({
      wallet_pubkey: row.walletPubkey ?? null,
      provider: row.provider,
      model: row.model,
      feature: row.feature,
      input_tokens: row.inputTokens ?? null,
      output_tokens: row.outputTokens ?? null,
      duration_ms: row.durationMs ?? null,
      fallback_reason: row.fallbackReason ?? null,
    })
    .then(() => undefined, () => undefined);
}
