// xAI image generation (Aurora).
//
// OpenAI-compatible /v1/images/generations endpoint. Reuses the same
// XAI_API_KEY the text models use, so no extra env is needed.
//
// IMPORTANT: grok-2-image and grok-2-image-1212 were deprecated by xAI on
// 2026-02-24. The current image model is the next-gen Aurora variant.
// Override via XAI_IMAGE_MODEL if xAI ships a new ID we don't know yet.

const DEFAULT_MODEL = process.env.XAI_IMAGE_MODEL || "grok-image-2";
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

export interface XAIImageRequest {
  prompt: string;
  model?: string;
  /** Number of images to return (Aurora default: 1, max: 10). */
  n?: number;
  /** "url" or "b64_json". We use b64_json so we can ship straight to IPFS. */
  responseFormat?: "url" | "b64_json";
}

export interface XAIImageResponse {
  imageDataUrl: string; // data:image/jpeg;base64,...
  provider: "xai";
  model: string;
  revisedPrompt?: string;
}

export async function callXAIImage(req: XAIImageRequest): Promise<XAIImageResponse> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY not set");

  // Try the requested/default model first, then fall through to known
  // alternate model IDs so an account with one variant provisioned still
  // works without manual env tweaking.
  const candidateModels: string[] = [];
  if (req.model) candidateModels.push(req.model);
  // Walk newest-known → older. The legacy 'grok-2-image' family was
  // killed on 2026-02-24, kept at the end purely as a probe in case
  // xAI brings it back or the account still has access.
  candidateModels.push(
    DEFAULT_MODEL,
    "grok-image-2",
    "grok-image-1",
    "grok-image",
    "aurora-1",
    "aurora",
    "grok-2-image-1212",
    "grok-2-image",
  );
  const tried = new Set<string>();

  let res: Response | undefined;
  let lastErr = "";
  let modelUsed = "";

  for (const m of candidateModels) {
    if (tried.has(m)) continue;
    tried.add(m);
    modelUsed = m;
    res = await fetch(`${XAI_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: m,
        prompt: req.prompt,
        n: req.n ?? 1,
        response_format: req.responseFormat ?? "b64_json",
      }),
    });
    if (res.ok) break;
    lastErr = await res.text().catch(() => "");
    // 404 / 400 model-not-found → try next candidate. Other errors → stop.
    const looksLikeModelMiss = /model|not.*found|invalid/i.test(lastErr) && (res.status === 404 || res.status === 400);
    if (!looksLikeModelMiss) break;
    console.warn(`[xaiImage] model ${m} rejected (${res.status}): ${lastErr.slice(0, 160)} — trying next candidate`);
  }

  if (!res || !res.ok) {
    console.error(`[xaiImage] all candidates exhausted: ${lastErr.slice(0, 400)}`);
    throw new Error(`xAI image API: ${lastErr.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  };
  const first = data.data?.[0];
  if (!first) throw new Error("xAI image API returned no data");

  let dataUrl: string;
  if (first.b64_json) {
    dataUrl = `data:image/jpeg;base64,${first.b64_json}`;
  } else if (first.url) {
    // Fetch the URL and convert to base64 — keeps the rest of the pipeline
    // (Pump.fun IPFS upload) URL-agnostic.
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Failed to fetch xAI image URL: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type") || "image/jpeg";
    dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
  } else {
    throw new Error("xAI image API returned neither b64_json nor url");
  }

  return {
    imageDataUrl: dataUrl,
    provider: "xai",
    model: modelUsed,
    revisedPrompt: first.revised_prompt,
  };
}
