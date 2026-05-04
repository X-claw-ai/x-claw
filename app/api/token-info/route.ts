import { NextResponse } from "next/server";
import { fetchTokenInfo } from "@/lib/solana/tokenInfo";
import { RPC_URL } from "@/lib/solana/connection";

// POST /api/token-info
// Body: { mint: string }
// Returns { supply, largestAccounts } via the configured Solana RPC.
// Read-only, no keys.

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { mint?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body.mint || typeof body.mint !== "string") {
    return NextResponse.json(
      { ok: false, error: "mint is required" },
      { status: 400 }
    );
  }
  try {
    const info = await fetchTokenInfo(body.mint.trim(), RPC_URL);
    return NextResponse.json({ ok: true, info });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
