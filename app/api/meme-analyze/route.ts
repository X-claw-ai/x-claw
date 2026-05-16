import { NextResponse } from "next/server";
import { getRadarMeme } from "@/lib/memeRadar";
import { localStubAnalysis, type MemeAnalysis } from "@/lib/memeAnalysis";
import { callLLM, getActiveProvider } from "@/lib/llm/router";
import { buildMemeAnalysisMessages } from "@/lib/llm/promptMemeAnalysis";

// POST /api/meme-analyze
// Body: { memeId: string }
// Returns: { ok, analysis, provider, model, fallbackReason? }

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { memeId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body.memeId) {
    return NextResponse.json(
      { ok: false, error: "memeId is required" },
      { status: 400 }
    );
  }

  const meme = getRadarMeme(body.memeId);
  if (!meme) {
    return NextResponse.json(
      { ok: false, error: `Meme not found: ${body.memeId}` },
      { status: 404 }
    );
  }

  const provider = getActiveProvider();
  if (!provider) {
    return NextResponse.json({
      ok: true,
      provider: "mock",
      model: "koki-stub",
      analysis: localStubAnalysis(meme),
      note:
        "No LLM provider configured. Showing local stub analysis. Set XAI_API_KEY for Grok.",
    });
  }

  try {
    const llm = await callLLM({
      messages: buildMemeAnalysisMessages(meme),
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 1200,
      model: "fast", // Analyze is short, use grok-4-fast-reasoning
    });
    let txt = llm.content.trim();
    if (txt.startsWith("```")) {
      txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    }
    let parsed: MemeAnalysis;
    try {
      parsed = JSON.parse(txt) as MemeAnalysis;
    } catch (parseErr) {
      return NextResponse.json({
        ok: true,
        provider: "mock",
        model: "koki-stub",
        analysis: localStubAnalysis(meme),
        fallbackReason: `LLM (${llm.provider}) returned non-JSON: ${(parseErr as Error).message}`,
      });
    }
    return NextResponse.json({
      ok: true,
      provider: llm.provider,
      model: llm.model,
      usage: llm.usage,
      analysis: parsed,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      provider: "mock",
      model: "koki-stub",
      analysis: localStubAnalysis(meme),
      fallbackReason: err instanceof Error ? err.message : String(err),
    });
  }
}
