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
  // ─── Agent Tools API (replaced deprecated Live Search) ──────────────
  // xAI deprecated `search_parameters` in May 2026. The replacement is
  // their Agent Tools API — server-side built-in tools that the model
  // invokes during generation. We use the `x_search` tool which performs
  // keyword/semantic/user search + thread fetch on X.
  //
  // Reference: https://docs.x.ai/docs/guides/tools/x-search
  // Built-in tools run on xAI's servers; we just provide tool config.
  // Citations come back the same way Live Search returned them.
  //
  // X Search requires a search-capable model. The recommended model per
  // xAI docs is `grok-4.3`. Older `grok-4-latest` / `grok-4-0709` may
  // not support the new tools schema. Operators can pin the auto-concept
  // call to a specific model via XAI_MODEL_AUTO_CONCEPT.
  if (req.liveSearch) {
    const xSearchTool: Record<string, unknown> = { type: "x_search" };
    // Optional sub-parameters (date range / handle filters / image+video
    // understanding) — only attach when the caller actually set them.
    const ls = req.liveSearch;
    if (ls.fromDate) xSearchTool.from_date = ls.fromDate;
    if (ls.toDate) xSearchTool.to_date = ls.toDate;
    if (ls.allowedXHandles && ls.allowedXHandles.length > 0) {
      xSearchTool.allowed_x_handles = ls.allowedXHandles.slice(0, 10);
    }
    if (ls.excludedXHandles && ls.excludedXHandles.length > 0) {
      xSearchTool.excluded_x_handles = ls.excludedXHandles.slice(0, 10);
    }
    if (ls.enableImageUnderstanding) xSearchTool.enable_image_understanding = true;
    if (ls.enableVideoUnderstanding) xSearchTool.enable_video_understanding = true;
    body.tools = [xSearchTool];
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
