import { NextResponse, type NextRequest } from "next/server";
import { callXAIImage } from "@/lib/llm/xaiImage";
import { callOpenAIImage } from "@/lib/llm/openaiImage";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface GenerateImageBody {
  prompt: string;
  walletPubkey?: string;
  feature?: string; // for usage tracking, e.g. "auto-launch" / "manual-logo"
}

interface GenerateImageResponse {
  ok: boolean;
  imageDataUrl?: string;
  provider?: "xai" | "openai" | "mock";
  model?: string;
  revisedPrompt?: string;
  fallbackReason?: string;
  error?: string;
}

/**
 * POST /api/generate-image
 *
 * Tries xAI Aurora first (Grok-first), falls back to DALL-E 3, then to a
 * deterministic placeholder if neither is available. Returns a base64 data
 * URL the client can preview AND ship straight to Pump.fun IPFS.
 *
 * Usage trail logged to Supabase llm_usage (best-effort).
 */
export async function POST(req: NextRequest) {
  let body: GenerateImageBody;
  try {
    body = (await req.json()) as GenerateImageBody;
  } catch {
    return NextResponse.json<GenerateImageResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  if (!body.prompt || body.prompt.trim().length < 4) {
    return NextResponse.json<GenerateImageResponse>(
      { ok: false, error: "prompt is required (≥ 4 chars)" },
      { status: 400 },
    );
  }

  const safePrompt = sanitizePrompt(body.prompt);
  const feature = body.feature || "image";
  const startedAt = Date.now();
  const attempts: { provider: string; error: string }[] = [];

  // 1. xAI Aurora
  if (process.env.XAI_API_KEY) {
    try {
      const out = await callXAIImage({ prompt: safePrompt });
      logUsage({
        provider: "xai",
        model: out.model,
        feature,
        durationMs: Date.now() - startedAt,
        walletPubkey: body.walletPubkey,
      });
      return NextResponse.json<GenerateImageResponse>({
        ok: true,
        imageDataUrl: out.imageDataUrl,
        provider: "xai",
        model: out.model,
        revisedPrompt: out.revisedPrompt,
        fallbackReason: undefined,
      });
    } catch (err) {
      attempts.push({
        provider: "xai",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. OpenAI DALL-E 3
  if (process.env.OPENAI_API_KEY) {
    try {
      const out = await callOpenAIImage({ prompt: safePrompt });
      logUsage({
        provider: "openai",
        model: out.model,
        feature,
        durationMs: Date.now() - startedAt,
        walletPubkey: body.walletPubkey,
        fallbackReason: attempts.map((a) => a.provider).join("→") || undefined,
      });
      return NextResponse.json<GenerateImageResponse>({
        ok: true,
        imageDataUrl: out.imageDataUrl,
        provider: "openai",
        model: out.model,
        revisedPrompt: out.revisedPrompt,
        fallbackReason: attempts.map((a) => `${a.provider}: ${a.error}`).join("; "),
      });
    } catch (err) {
      attempts.push({
        provider: "openai",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3. No image provider configured → deterministic mock
  return NextResponse.json<GenerateImageResponse>({
    ok: true,
    imageDataUrl: PLACEHOLDER_DATA_URL,
    provider: "mock",
    model: "deterministic-placeholder",
    fallbackReason:
      attempts.length > 0
        ? attempts.map((a) => `${a.provider}: ${a.error}`).join("; ")
        : "No image provider configured (set XAI_API_KEY or OPENAI_API_KEY)",
  });
}

/** Strip / soften phrases that often trip image-model safety. */
function sanitizePrompt(p: string): string {
  return p
    .replace(/\b(child|kid|minor|underage)\b/gi, "character")
    .replace(/\b(nude|naked|nsfw|porn|sexual)\b/gi, "")
    .trim()
    .slice(0, 1000);
}

function logUsage(row: {
  provider: string;
  model: string;
  feature: string;
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
      duration_ms: row.durationMs ?? null,
      fallback_reason: row.fallbackReason ?? null,
    })
    .then(() => undefined, () => undefined);
}

// Tiny 1×1 orange placeholder so even the mock branch returns a valid PNG.
const PLACEHOLDER_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPk/Y//PwAFhAJ/wlseKgAAAABJRU5ErkJggg==";
