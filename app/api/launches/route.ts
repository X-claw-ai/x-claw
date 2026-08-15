import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, supabaseEnabled } from "@/lib/supabase/server";

interface LaunchInsert {
  /** 0x… EVM signer that submitted the Pons launch tx. */
  walletAddress: string;
  /** 0x… ERC-20 contract address the Pons factory returned. */
  tokenAddress: string;
  ticker: string;
  tokenName: string;
  chain?: string;
  status?: "launched" | "pending-signature" | "draft" | "failed";
  txHash?: string;
  ponsUrl?: string;
  explorerUrl?: string;
  logoUrl?: string;
  poolAddress?: string;
  initialBuyEth?: number;
  mock?: boolean;
  /**
   * URL of the originating viral X post that inspired this token, when
   * known. Recorded so /api/auto-launch can hard-exclude it from future
   * Grok picks, no two KOKi-shipped tokens should ever come from the
   * same X post (deduplication across all wallets).
   */
  sourceXUrl?: string;
}

/**
 * POST — server-side persist of a real Pons launch.
 * Body: LaunchInsert (camelCase). Server maps to snake_case columns.
 *
 * If Supabase is not configured, returns { ok:true, persisted:false } so
 * the client can keep the localStorage record without surfacing an error.
 */
export async function POST(req: NextRequest) {
  let body: LaunchInsert;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.walletAddress || !body.tokenAddress || !body.ticker || !body.tokenName) {
    return NextResponse.json(
      { ok: false, error: "walletAddress, tokenAddress, ticker, tokenName required" },
      { status: 400 },
    );
  }

  if (!supabaseEnabled()) {
    return NextResponse.json({ ok: true, persisted: false, reason: "supabase-not-configured" });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ ok: true, persisted: false, reason: "supabase-client-missing" });
  }

  const { data, error } = await sb
    .from("pons_launches")
    .upsert(
      {
        wallet_address: body.walletAddress,
        token_address: body.tokenAddress,
        pool_address: body.poolAddress ?? null,
        ticker: body.ticker,
        token_name: body.tokenName,
        chain: body.chain ?? "robinhood",
        status: body.status ?? "launched",
        tx_hash: body.txHash ?? null,
        pons_url: body.ponsUrl ?? null,
        explorer_url: body.explorerUrl ?? null,
        logo_url: body.logoUrl ?? null,
        initial_buy_eth: body.initialBuyEth ?? null,
        mock: body.mock ?? false,
        source_x_url: body.sourceXUrl ?? null,
      },
      { onConflict: "token_address" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, persisted: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, persisted: true, launch: data });
}

/**
 * GET — list launches.
 *
 * Two modes:
 *   ?wallet=<0x…>  → only that wallet's launches (used by /dashboard,
 *                    "My Launches", wallet-scoped)
 *   (no wallet)    → ALL launches across all wallets, newest first.
 *                    Used by /launches ("All Launches"). Capped at 200
 *                    so the response stays bounded.
 */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");

  if (!supabaseEnabled()) {
    return NextResponse.json({ ok: true, persisted: false, launches: [] });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ ok: true, persisted: false, launches: [] });
  }

  let query = sb
    .from("pons_launches")
    .select("*")
    .eq("mock", false) // public board: never expose mock rows
    .eq("status", "launched") // only show actually-shipped tokens
    .order("created_at", { ascending: false })
    .limit(200);

  if (wallet) {
    query = query.eq("wallet_address", wallet);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true, launches: data ?? [] });
}

/**
 * DELETE ?wallet=<0x…> — clear all launch history rows for a wallet.
 *
 * Onchain tokens themselves are immutable — this only removes the rows
 * KOKi has tracked. The user's dashboard goes back to an empty state.
 */
export async function DELETE(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ ok: false, error: "wallet param required" }, { status: 400 });
  }

  if (!supabaseEnabled()) {
    return NextResponse.json({ ok: true, persisted: false, deleted: 0 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ ok: true, persisted: false, deleted: 0 });
  }

  const { error, count } = await sb
    .from("pons_launches")
    .delete({ count: "exact" })
    .eq("wallet_address", wallet);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true, deleted: count ?? 0 });
}
