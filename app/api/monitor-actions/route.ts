import { NextResponse } from "next/server";
import { callLLM, getActiveProvider } from "@/lib/llm/router";
import {
  buildMonitorActionsMessages,
  localStubMonitorActions,
  type MonitorContext,
  type MonitorActionsResult,
} from "@/lib/llm/promptMonitorActions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Partial<MonitorContext> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.tokenName || !body.ticker || !body.mint) {
    return NextResponse.json(
      { ok: false, error: "tokenName, ticker, and mint are required" },
      { status: 400 }
    );
  }

  const ctx: MonitorContext = {
    tokenName: body.tokenName,
    ticker: body.ticker,
    mint: body.mint,
    supplyUiAmount: Number(body.supplyUiAmount ?? 0),
    top10SharePct: Number(body.top10SharePct ?? 0),
    recentTxCount: Number(body.recentTxCount ?? 0),
    hoursSinceLaunch: body.hoursSinceLaunch,
  };

  const provider = getActiveProvider();
  if (!provider) {
    return NextResponse.json({
      ok: true,
      provider: "mock",
      model: "x-claw-stub",
      actions: localStubMonitorActions(ctx),
      note: "No LLM provider configured. Showing stub actions. Set XAI_API_KEY for Grok.",
    });
  }

  try {
    const llm = await callLLM({
      messages: buildMonitorActionsMessages(ctx),
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 1000,
      model: "fast", // Monitor actions are short — use grok-4-fast-reasoning
    });
    let txt = llm.content.trim();
    if (txt.startsWith("```")) txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    let parsed: MonitorActionsResult;
    try {
      parsed = JSON.parse(txt) as MonitorActionsResult;
    } catch (parseErr) {
      return NextResponse.json({
        ok: true,
        provider: "mock",
        model: "x-claw-stub",
        actions: localStubMonitorActions(ctx),
        fallbackReason: `LLM returned non-JSON: ${(parseErr as Error).message}`,
      });
    }
    return NextResponse.json({
      ok: true,
      provider: llm.provider,
      model: llm.model,
      usage: llm.usage,
      actions: parsed,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      provider: "mock",
      model: "x-claw-stub",
      actions: localStubMonitorActions(ctx),
      fallbackReason: err instanceof Error ? err.message : String(err),
    });
  }
}
