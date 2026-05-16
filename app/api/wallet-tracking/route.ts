import { NextResponse } from "next/server";
import { buildWalletReport, digestWalletReport } from "@/lib/solana/walletReport";
import { callLLM, getActiveProvider, LLMRouterError } from "@/lib/llm/router";
import { buildWalletSummaryMessages } from "@/lib/llm/promptWalletSummary";
import { RPC_URL } from "@/lib/solana/connection";

// ─────────────────────────────────────────────────────────────────────────
// POST /api/wallet-tracking
//
// Body: { address: string }
//
// 1. Pull a real onchain snapshot from the configured Solana RPC.
//    (No keys, no signing, strictly read-only public state.)
// 2. Optionally pass the snapshot to Grok for a natural-language brief.
//    If no LLM provider is configured, we still return the structured snapshot
//    so the UI can render the onchain data without the AI summary.
// ─────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

interface SummaryShape {
  headline?: string;
  summary?: string;
  highlights?: string[];
  xPost?: string;
}

export async function POST(req: Request) {
  let body: { address?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body.address || typeof body.address !== "string") {
    return NextResponse.json(
      { ok: false, error: "address is required" },
      { status: 400 }
    );
  }

  // Step 1, onchain snapshot
  let report;
  try {
    report = await buildWalletReport(body.address.trim(), RPC_URL);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "rpc",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }

  // Step 2, Grok summary (optional)
  const provider = getActiveProvider();
  if (!provider) {
    return NextResponse.json({
      ok: true,
      report,
      summary: null,
      provider: null,
      note:
        "No LLM provider configured. Set XAI_API_KEY for the natural-language summary.",
    });
  }

  try {
    const digest = digestWalletReport(report);
    const llm = await callLLM({
      messages: buildWalletSummaryMessages(digest),
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 1200,
      model: "fast", // Wallet brief is short, use grok-4-fast-reasoning
    });
    let parsed: SummaryShape | null = null;
    try {
      const cleaned = llm.content
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```\s*$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      // Couldn't parse: return raw text so the UI can still show something
      parsed = { summary: llm.content };
    }
    return NextResponse.json({
      ok: true,
      report,
      summary: parsed,
      provider: llm.provider,
      model: llm.model,
      usage: llm.usage,
    });
  } catch (err) {
    const reason =
      err instanceof LLMRouterError
        ? err.message
        : err instanceof Error
        ? err.message
        : String(err);
    return NextResponse.json({
      ok: true,
      report,
      summary: null,
      provider: null,
      summaryFallbackReason: reason,
    });
  }
}
