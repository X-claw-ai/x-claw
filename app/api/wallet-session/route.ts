import { NextResponse } from "next/server";

// POST /api/wallet-session
// ─────────────────────────────────────────────────────────────────────────────
// MVP: issues a mock session token for a wallet address. No verification.
//
// REAL INTEGRATION (later):
//   • Sign-In With Solana (SIWS), server issues a nonce, client signs it,
//     server verifies signature and address, then sets an httpOnly session
//     cookie. Use a JWT or opaque token tied to user/wallet pair.
//   • Mirror with EIP-4361 if you add EVM chains later.
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
      chain: body.chain ?? "solana",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      token: "mock_session_token",
    },
  });
}
