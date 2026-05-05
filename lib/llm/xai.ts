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
  // xAI Grok Live Search — lets the model search X / web during generation
  // and cite real tweet URLs. Off by default; opt-in via req.liveSearch.
  if (req.liveSearch) {
    const sources = (req.liveSearch.sources || ["x"]).map((s) => ({ type: s }));
    body.search_parameters = {
      mode: req.liveSearch.mode || "on",
      sources,
      max_search_results: req.liveSearch.maxResults || 10,
      return_citations: true,
    };
  }

  let res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Self-healing retry: if the request was rejected with search_parameters
  // attached, ALWAYS retry once without them on any 4xx. xAI's error text
  // varies (sometimes "search not enabled", sometimes just "Bad Request"
  // or "invalid request"), so a regex-narrow check was missing real cases
  // and forcing a hard provider-level fallback to OpenAI.
  let searchRejection: { status: number; error: string } | undefined;
  if (!res.ok && body.search_parameters && res.status >= 400 && res.status < 500) {
    const errText = await res.text().catch(() => "");
    console.warn(
      `[xai] retrying without search_parameters — original ${res.status}: ${errText.slice(0, 300)}`,
    );
    searchRejection = { status: res.status, error: errText.slice(0, 500) };
    delete body.search_parameters;
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[xai] ${res.status} ${text.slice(0, 400)}`);
    throw new Error(`xAI API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const choice = data?.choices?.[0]?.message?.content;
  if (typeof choice !== "string") {
    throw new Error("xAI API returned an unexpected payload shape");
  }

  // xAI returns Live Search citations either at top level or in the choice.
  const citations: string[] | undefined =
    Array.isArray(data?.citations) && data.citations.every((c: unknown) => typeof c === "string")
      ? (data.citations as string[])
      : Array.isArray(data?.choices?.[0]?.message?.citations)
      ? (data.choices[0].message.citations as string[])
      : undefined;

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
    citations,
    searchRejection,
  };
}
