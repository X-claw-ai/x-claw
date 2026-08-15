import { NextResponse, type NextRequest } from "next/server";
import { callXAIImage } from "@/lib/llm/xaiImage";
import { callOpenAIImage } from "@/lib/llm/openaiImage";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface GenerateImageBody {
  prompt: string;
  walletPubkey?: string;
  feature?: string; // for usage tracking, e.g. "auto-launch" / "manual-logo"
  /** Optional ticker, used when both real image APIs fail, so the
   *  visual fallback at least shows the user the ticker on an orange tile. */
  ticker?: string;
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

  // 3. Both real APIs failed (or no key configured) → render a visible
  //    SVG fallback so the user can see SOMETHING. The ticker (or first
  //    word of the prompt) goes on an orange tile in heavy black type.
  console.error(`[generate-image] all providers failed, returning SVG fallback. Attempts: ${attempts.map((a) => `${a.provider}: ${a.error}`).join("; ")}`);
  const ticker = (body.ticker || body.prompt.match(/\$([A-Z0-9]{2,8})/)?.[1] || "HAMR").toUpperCase().slice(0, 6);
  const svgFallback = renderSvgFallback(ticker);
  return NextResponse.json<GenerateImageResponse>({
    ok: true,
    imageDataUrl: svgFallback,
    provider: "mock",
    model: "svg-placeholder",
    fallbackReason:
      attempts.length > 0
        ? attempts.map((a) => `${a.provider}: ${a.error}`).join("; ")
        : "No image provider configured (set XAI_API_KEY or OPENAI_API_KEY)",
  });
}

/** Visible SVG placeholder, orange tile with ticker in heavy black type. */
function renderSvgFallback(ticker: string): string {
  const safeTicker = ticker.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#E55B14"/>
  <text x="512" y="540" font-family="Inter, -apple-system, system-ui, sans-serif" font-weight="900" font-size="220" fill="#0B0B0B" text-anchor="middle" dominant-baseline="middle" letter-spacing="-8">${safeTicker}</text>
  <g transform="translate(900,80) scale(2.5)">
    <ellipse cx="16" cy="22" rx="7.5" ry="6" fill="#0B0B0B"/>
    <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill="#0B0B0B"/>
    <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill="#0B0B0B"/>
    <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill="#0B0B0B"/>
    <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill="#0B0B0B"/>
  </g>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
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
      wallet_address: row.walletPubkey ?? null,
      provider: row.provider,
      model: row.model,
      feature: row.feature,
      duration_ms: row.durationMs ?? null,
      fallback_reason: row.fallbackReason ?? null,
    })
    .then(() => undefined, () => undefined);
}

