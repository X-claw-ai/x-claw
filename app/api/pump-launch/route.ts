import { NextResponse } from "next/server";
import { uploadPumpIpfs, placeholderLogoBlob } from "@/lib/pumpfun/ipfs";
import { buildCreateTokenTx } from "@/lib/pumpfun/pumpPortal";

// ─────────────────────────────────────────────────────────────────────────
// POST /api/pump-launch
//
// Server prepares a real Pump.fun launch:
//   1. Decode logo (base64 data URL → Blob).
//   2. Upload metadata + image to Pump.fun IPFS → metadataUri.
//   3. Call PumpPortal trade-local with creator pubkey + new mint pubkey.
//      Receive an UNSIGNED VersionedTransaction.
//   4. Return tx bytes (base64) + metadataUri to the client.
//
// The client then:
//   • Deserializes the tx
//   • Signs with the mint keypair (it generated)
//   • Asks the wallet (Phantom / Solflare) to sign
//   • Submits to Solana RPC
//   • Awaits confirmation
//
// HARD RULES enforced here:
//   • Server NEVER signs. Server NEVER holds keys.
//   • Server NEVER receives the mint keypair's secret key.
//   • Body must include creator publicKey and mint publicKey (both base58).
// ─────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

interface PumpLaunchBody {
  creatorPublicKey: string;
  mintPublicKey: string;
  tokenName: string;
  ticker: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  /** base64 data URL of the logo image, e.g. "data:image/png;base64,..." */
  logoDataUrl?: string | null;
  /** Initial dev buy in SOL. 0 to skip. Capped server-side at 10 SOL for safety. */
  amountInSol?: number;
  slippage?: number;
  priorityFee?: number;
}

const MAX_DEV_BUY_SOL = 10;

export async function POST(req: Request) {
  let body: Partial<PumpLaunchBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const required: (keyof PumpLaunchBody)[] = [
    "creatorPublicKey",
    "mintPublicKey",
    "tokenName",
    "ticker",
    "description",
  ];
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === "") {
      return NextResponse.json(
        { ok: false, error: `Missing field: ${k}` },
        { status: 400 }
      );
    }
  }

  const ticker = String(body.ticker).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!ticker) {
    return NextResponse.json(
      { ok: false, error: "Ticker must contain at least one A-Z or 0-9 character" },
      { status: 400 }
    );
  }

  const amountInSol = clampNumber(body.amountInSol ?? 0, 0, MAX_DEV_BUY_SOL);
  const slippage = clampNumber(body.slippage ?? 10, 0.1, 50);
  const priorityFee = clampNumber(body.priorityFee ?? 0.0005, 0, 0.05);

  // 1. Convert logo
  let logoBlob: Blob;
  try {
    if (body.logoDataUrl) {
      logoBlob = dataUrlToBlob(body.logoDataUrl);
    } else {
      logoBlob = placeholderLogoBlob();
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not decode logo image: ${(err as Error).message}`,
      },
      { status: 400 }
    );
  }

  // 2. Upload to Pump.fun IPFS
  let metadataUri: string;
  try {
    const upload = await uploadPumpIpfs(logoBlob, {
      name: body.tokenName!,
      symbol: ticker,
      description: body.description!,
      twitter: body.twitter,
      telegram: body.telegram,
      website: body.website,
    });
    metadataUri = upload.metadataUri;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "ipfs",
        error: (err as Error).message,
      },
      { status: 502 }
    );
  }

  // 3. Build unsigned tx via PumpPortal
  let txBytes: Uint8Array;
  try {
    const result = await buildCreateTokenTx({
      publicKey: body.creatorPublicKey!,
      mint: body.mintPublicKey!,
      metadataUri,
      name: body.tokenName!,
      symbol: ticker,
      amountInSol,
      slippage,
      priorityFee,
    });
    txBytes = result.txBytes;
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "pump-portal",
        error: (err as Error).message,
        metadataUri,
      },
      { status: 502 }
    );
  }

  // 4. Return base64-encoded tx + metadata for client signing
  const txBase64 = Buffer.from(txBytes).toString("base64");
  return NextResponse.json({
    ok: true,
    metadataUri,
    txBase64,
    ticker,
    pumpUrl: `https://pump.fun/coin/${body.mintPublicKey}`,
    devBuyInSol: amountInSol,
    note: "Server prepared. Client must now sign with mint keypair + wallet, then submit.",
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("logoDataUrl is not a base64 data URL");
  const mime = match[1] || "image/png";
  const buf = Buffer.from(match[2], "base64");
  return new Blob([buf], { type: mime });
}

function clampNumber(n: number, min: number, max: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
