// OpenAI DALL-E 3 image generation — fallback when xAI Aurora is unavailable.
// Uses the existing OPENAI_API_KEY (already in the LLM router).

const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";

export interface OpenAIImageRequest {
  prompt: string;
  model?: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
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

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      prompt: req.prompt,
      n: 1,
      size: req.size ?? "1024x1024",
      quality: req.quality ?? "standard",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI image API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; revised_prompt?: string }>;
  };
  const first = data.data?.[0];
  if (!first?.b64_json) throw new Error("OpenAI image API returned no b64_json");

  return {
    imageDataUrl: `data:image/png;base64,${first.b64_json}`,
    provider: "openai",
    model,
    revisedPrompt: first.revised_prompt,
  };
}
