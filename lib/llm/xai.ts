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

  // X Search lives ONLY on the Responses API endpoint (/v1/responses).
  // chat/completions returns 410/422 for every search variant we tried.
  // Route requests with liveSearch through the dedicated adapter below.
  if (req.liveSearch) {
    return callXAIResponses(req, apiKey, model);
  }

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
  };
}

/**
 * xAI Responses API adapter (/v1/responses).
 *
 * Used for any request that needs server-managed Agent Tools (x_search,
 * web_search, code_execution, MCP). The Responses API is xAI's recommended
 * endpoint going forward and is the ONLY place X search works after the
 * chat/completions deprecation.
 *
 * Differences from chat/completions:
 *   - endpoint: /v1/responses
 *   - messages → input
 *   - max_tokens → max_output_tokens
 *   - response.choices[0].message.content → response.output[*]…content[*].text
 *   - tools are server-executed (we never see tool_calls — just the final
 *     text + citations)
 *
 * Reference: https://docs.x.ai/docs/migrating-to-responses-api
 */
async function callXAIResponses(
  req: LLMRequest,
  apiKey: string,
  model: string,
): Promise<LLMResponse> {
  const ls = req.liveSearch ?? {};

  // Build the x_search tool. Fields go flat on the tool object; the docs
  // SDK example shows `x_search(allowed_x_handles=[...], from_date=...)`.
  const xSearchTool: Record<string, unknown> = { type: "x_search" };
  if (ls.fromDate) xSearchTool.from_date = ls.fromDate;
  if (ls.toDate) xSearchTool.to_date = ls.toDate;
  if (ls.maxResults) xSearchTool.max_search_results = ls.maxResults;
  if (ls.allowedXHandles && ls.allowedXHandles.length > 0) {
    xSearchTool.allowed_x_handles = ls.allowedXHandles.slice(0, 10);
  }
  if (ls.excludedXHandles && ls.excludedXHandles.length > 0) {
    xSearchTool.excluded_x_handles = ls.excludedXHandles.slice(0, 10);
  }
  if (ls.enableImageUnderstanding) xSearchTool.enable_image_understanding = true;
  if (ls.enableVideoUnderstanding) xSearchTool.enable_video_understanding = true;

  const body: Record<string, unknown> = {
    model,
    input: req.messages,
    tools: [xSearchTool],
    // Don't store stateful conversation server-side — we manage history
    // ourselves and don't need the 30-day retention.
    store: false,
  };
  if (req.maxTokens) body.max_output_tokens = req.maxTokens;
  if (req.temperature !== undefined) body.temperature = req.temperature;
  // Responses API uses `text.format` for JSON mode (NOT `response_format` — that
  // field is /v1/chat/completions only and produces a 400 here). xAI's error
  // message is verbatim: "'response_format' is not supported on /v1/responses
  // - use 'text.format' on /v1/responses".
  if (req.responseFormat === "json") {
    body.text = { format: { type: "json_object" } };
  }

  const res = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[xai/responses] ${res.status} ${errText.slice(0, 400)}`);
    const err = new Error(
      `xAI Responses API error ${res.status}: ${errText.slice(0, 400)}`,
    );
    // Attach the rejection so callers can surface it for debugging without
    // losing the http status when the router falls through.
    (err as Error & { searchRejection?: { status: number; error: string } }).searchRejection = {
      status: res.status,
      error: errText.slice(0, 500),
    };
    throw err;
  }

  const data = (await res.json()) as Record<string, unknown>;

  // Walk output[] and pull every `output_text` chunk. Concatenate them so
  // the caller sees a single string, same as it gets from chat/completions.
  const output = Array.isArray(data?.output) ? (data.output as unknown[]) : [];
  const textChunks: string[] = [];
  const inlineCitations: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (it.type === "message" && Array.isArray(it.content)) {
      for (const c of it.content as unknown[]) {
        if (!c || typeof c !== "object") continue;
        const cc = c as Record<string, unknown>;
        if (cc.type === "output_text" && typeof cc.text === "string") {
          textChunks.push(cc.text);
        }
        // Some responses inline citations under each text chunk.
        if (Array.isArray(cc.citations)) {
          for (const cit of cc.citations as unknown[]) {
            if (typeof cit === "string") inlineCitations.push(cit);
          }
        }
      }
    }
  }

  const content = textChunks.join("");
  if (!content) {
    throw new Error("xAI Responses API returned no text output");
  }

  // Citations may also live at the top of the response.
  const topLevelCitations: string[] = Array.isArray(data?.citations)
    ? (data.citations as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const citations = Array.from(new Set([...topLevelCitations, ...inlineCitations]));

  // Usage in Responses API uses input_tokens / output_tokens names.
  const usage = data?.usage as Record<string, unknown> | undefined;

  return {
    content,
    provider: "xai",
    model: (data.model as string) || model,
    usage: usage
      ? {
          input: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
          output: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
        }
      : undefined,
    citations: citations.length > 0 ? citations : undefined,
  };
}
