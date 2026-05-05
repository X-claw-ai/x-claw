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
  // ─── Agent Tools API ─────────────────────────────────────────────────
  // xAI deprecated the top-level `search_parameters` field but kept the
  // search functionality alive as a built-in tool: `tools: [{type: "live_search"}]`
  // on the same /v1/chat/completions endpoint. The newer `x_search` /
  // `web_search` types live on the OpenAI Responses API endpoint
  // (/v1/responses) — for chat/completions we use `live_search`.
  //
  // Confirmed by error: "expected `function` or `live_search`" when we
  // tried type:'x_search' on chat/completions.
  //
  // Reference: https://docs.x.ai/docs/guides/tools/overview
  if (req.liveSearch) {
    const ls = req.liveSearch;
    // Build the live_search config. xAI accepts the same field names that
    // worked under search_parameters: mode, sources, max_search_results,
    // return_citations. We map our friendlier camelCase fields onto them.
    const sources = (ls.sources || ["x"]).map((s) => ({ type: s }));
    const liveSearchConfig: Record<string, unknown> = {
      mode: ls.mode || "on",
      sources,
      max_search_results: ls.maxResults || 10,
      return_citations: true,
    };
    if (ls.fromDate) liveSearchConfig.from_date = ls.fromDate;
    if (ls.toDate) liveSearchConfig.to_date = ls.toDate;
    body.tools = [{ type: "live_search", live_search: liveSearchConfig }];
  }

  let res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Self-healing retry: if Agent Tools were rejected (model doesn't support,
  // wrong endpoint, payload-shape mismatch, etc.), retry once without `tools`
  // on any 4xx so the agent stays functional. Keeps Auto-pilot working even
  // if x_search availability changes again.
  let searchRejection: { status: number; error: string } | undefined;
  if (!res.ok && body.tools && res.status >= 400 && res.status < 500) {
    const errText = await res.text().catch(() => "");
    console.warn(
      `[xai] retrying without tools — original ${res.status}: ${errText.slice(0, 300)}`,
    );
    searchRejection = { status: res.status, error: errText.slice(0, 500) };
    delete body.tools;
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
