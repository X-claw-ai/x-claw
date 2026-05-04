// xAI image generation (Aurora — grok-2-image).
//
// OpenAI-compatible /v1/images/generations endpoint. Reuses the same
// XAI_API_KEY the text models use, so no extra env is needed.

const DEFAULT_MODEL = process.env.XAI_IMAGE_MODEL || "grok-2-image-1212";
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

  const model = req.model || DEFAULT_MODEL;

  const res = await fetch(`${XAI_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      prompt: req.prompt,
      n: req.n ?? 1,
      response_format: req.responseFormat ?? "b64_json",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`xAI image API ${res.status}: ${text.slice(0, 300)}`);
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
    model,
    revisedPrompt: first.revised_prompt,
  };
}
