// OpenAI image generation, fallback when xAI Aurora is unavailable.
// Uses the existing OPENAI_API_KEY (already in the LLM router).
//
// Model: gpt-image-1 (current as of 2026). response_format is rejected by
// OpenAI's newer image endpoints, so we let the API return its default
// (b64_json for gpt-image-1, URL for dall-e-*) and adapt either shape.

const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export interface OpenAIImageRequest {
  prompt: string;
  model?: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792" | "1024x1536" | "1536x1024";
  quality?: "standard" | "hd" | "low" | "medium" | "high";
}

export interface OpenAIImageResponse {
  imageDataUrl: string;
  provider: "openai";
  model: string;
  revisedPrompt?: string;
}

export async function callOpenAIImage(req: OpenAIImageRequest): Promise<OpenAIImageResponse> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const model = req.model || DEFAULT_MODEL;

  // gpt-image-1 uses different quality enum than dall-e-3:
  //   gpt-image-1: 'low' | 'medium' | 'high' | 'auto'
  //   dall-e-3:    'standard' | 'hd'
  // Pick a sane default per model; let req.quality override if set.
  const quality =
    req.quality ?? (model === "gpt-image-1" ? "medium" : "standard");

  const body: Record<string, unknown> = {
    model,
    prompt: req.prompt,
    n: 1,
    size: req.size ?? "1024x1024",
    quality,
  };
  // gpt-image-1 (and newer models) reject `response_format`. dall-e-2 still
  // accepts it. Only set the parameter when we know the model wants it.
  if (model.startsWith("dall-e-2")) {
    body.response_format = "b64_json";
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI image API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  };
  const first = data.data?.[0];
  if (!first) throw new Error("OpenAI image API returned no data");

  let dataUrl: string;
  if (first.b64_json) {
    dataUrl = `data:image/png;base64,${first.b64_json}`;
  } else if (first.url) {
    // dall-e-3 returns URLs by default. Fetch and convert to base64 so the
    // downstream pipeline (Pump.fun IPFS upload) stays URL-agnostic.
    const imgRes = await fetch(first.url);
    if (!imgRes.ok) throw new Error(`Failed to fetch OpenAI image URL: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type") || "image/png";
    dataUrl = `data:${ct};base64,${buf.toString("base64")}`;
  } else {
    throw new Error("OpenAI image API returned neither b64_json nor url");
  }

  return {
    imageDataUrl: dataUrl,
    provider: "openai",
    model,
    revisedPrompt: first.revised_prompt,
  };
}
