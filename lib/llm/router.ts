import type { LLMRequest, LLMResponse, Provider } from "./types";
import { callXAI } from "./xai";
import { callAnthropic } from "./anthropic";
import { callOpenAI } from "./openai";

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

  for (const p of ORDER) {
    const k = ENV_KEY[p as Exclude<Provider, "mock">];
    if (!process.env[k]) continue;
    try {
      return await CALLERS[p as Exclude<Provider, "mock">](req);
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
