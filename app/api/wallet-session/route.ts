import { NextResponse } from "next/server";

// POST /api/wallet-session
// ─────────────────────────────────────────────────────────────────────────────
// MVP: issues a mock session token for a wallet address. No verification.
//
// REAL INTEGRATION (later):
//   • Sign-In With Ethereum (EIP-4361 / SIWE) — server issues a nonce, the
//     wallet signs it, server verifies signature + Robinhood Chain address
//     and sets an httpOnly session cookie tied to the wallet.
//   • Hard rule: the session never grants the server permission to move funds.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let body: { address?: string; chain?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body.address) {
    return NextResponse.json(
      { ok: false, error: "address is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    mock: true,
    session: {
      address: body.address,
      chain: body.chain ?? "robinhood",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      token: "mock_session_token",
    },
  });
}
