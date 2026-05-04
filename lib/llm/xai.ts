import type { LLMRequest, LLMResponse } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// xAI Grok adapter
//
// xAI provides an OpenAI-compatible /v1/chat/completions endpoint. Get an
// API key at https://console.x.ai (set XAI_API_KEY in .env).
//
// Default model: latest flagship Grok ("grok-4-latest"). Override per call
// via the `model` field on LLMRequest, or globally via the XAI_MODEL env var.
// For lighter / cheaper calls (analyze, monitor, x-post, wallet brief) use
// "grok-4-fast-reasoning" — set that via XAI_MODEL_FAST.
// ─────────────────────────────────────────────────────────────────────────

const BASE = process.env.XAI_BASE_URL || "https://api.x.ai/v1";
const DEFAULT_MODEL = process.env.XAI_MODEL || "grok-4-latest";
const FAST_MODEL = process.env.XAI_MODEL_FAST || "grok-4-fast-reasoning";

/**
 * Resolve the right Grok model for a given LLMRequest.
 * - If req.model is explicitly set, use it.
 * - If req.model === "fast", use FAST_MODEL.
 * - Otherwise, use DEFAULT_MODEL.
 */
export function resolveXaiModel(reqModel?: string): string {
  if (!reqModel) return DEFAULT_MODEL;
  if (reqModel === "fast") return FAST_MODEL;
  if (reqModel === "default") return DEFAULT_MODEL;
  return reqModel;
}

export async function callXAI(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const model = resolveXaiModel(req.model);

  const body: Record<string, unknown> = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.7,
  };
  if (req.maxTokens) body.max_tokens = req.maxTokens;
  if (req.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`xAI API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const choice = data?.choices?.[0]?.message?.content;
  if (typeof choice !== "string") {
    throw new Error("xAI API returned an unexpected payload shape");
  }

  return {
    content: choice,
    provider: "xai",
    model: data.model || model,
    usage: data.usage
      ? {
          input: data.usage.prompt_tokens ?? 0,
          output: data.usage.completion_tokens ?? 0,
        }
      : undefined,
  };
}
