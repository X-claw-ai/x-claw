import { NextResponse } from "next/server";
import { RADAR_MEMES } from "@/lib/memeRadar";

// GET /api/meme-radar
//
// Today: returns the hand-curated mock list from `lib/memeRadar.ts`.
//
// REAL INTEGRATION (later):
//   • X API v2 recent search across hand-tuned meme heuristics.
//   • Grok / xAI live trend endpoint when public.
//   • Off-X social listening (TG, Discord) via aggregator APIs.
//   • Onchain mint metadata + holder velocity (Helius / Birdeye).
//   • Score blending happens server-side; UI consumes the final
//     RadarMeme[] shape unchanged.

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mock: true,
    detectedAt: new Date().toISOString(),
    memes: RADAR_MEMES,
    note:
      "Mock radar feed. Wire X API + xAI search + onchain indexer here later.",
  });
}
