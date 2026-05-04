import { NextResponse } from "next/server";

// POST /api/x-research
// ─────────────────────────────────────────────────────────────────────────────
// MVP: returns a mock research payload (trending narratives, related accounts).
//
// REAL INTEGRATION (later):
//   • X API v2 (recent search, trends, account lookup).
//   • Combine with on-chain context from Solana RPC (or an indexer like
//     Helius / Birdeye / Dexscreener).
//   • Cache results for 5–15 minutes per query to respect rate limits.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let body: { topic?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const topic = body.topic ?? "X-native crypto builders";

  return NextResponse.json({
    ok: true,
    mock: true,
    topic,
    trendingNarratives: [
      "On-chain agent OS",
      "User-approved on-chain execution",
      "X-native marketing workflows",
    ],
    relatedAccounts: [
      { handle: "@xai", note: "AI infra context" },
      { handle: "@solana", note: "Chain context" },
      { handle: "@dexscreener", note: "Market context" },
    ],
    notes: "Replace with X API + on-chain indexer responses.",
  });
}
