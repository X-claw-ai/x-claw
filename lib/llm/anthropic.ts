import type { LLMRequest, LLMResponse } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Anthropic Claude adapter (FALLBACK)
//
// Used only when XAI_API_KEY is absent or xAI calls fail. This keeps
// HAMR operational while we wait for / debug Grok access.
//
// Note: Anthropic separates `system` from `messages`, unlike OpenAI.
// ─────────────────────────────────────────────────────────────────────────

const BASE = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";
const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function callAnthropic(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const model = req.model || DEFAULT_MODEL;

  const systemMsgs = req.messages.filter((m) => m.role === "system");
  const otherMsgs = req.messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    messages: otherMsgs.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: req.maxTokens ?? 4096,
    temperature: req.temperature ?? 0.7,
  };
  if (systemMsgs.length) {
    body.system = systemMsgs.map((m) => m.content).join("\n\n");
  }

  const res = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const blocks: Array<{ type: string; text?: string }> = data?.content ?? [];
  const text = blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("\n");

  if (!text) {
    throw new Error("Anthropic API returned an unexpected payload shape");
  }

  return {
    content: text,
    provider: "anthropic",
    model: data.model || model,
    usage: data.usage
      ? {
          input: data.usage.input_tokens ?? 0,
          output: data.usage.output_tokens ?? 0,
        }
      : undefined,
  };
}
