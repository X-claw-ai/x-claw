import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, supabaseEnabled } from "@/lib/supabase/server";

interface LaunchInsert {
  walletPubkey: string;
  mintPubkey: string;
  ticker: string;
  tokenName: string;
  chain?: string;
  status?: "launched" | "pending-signature" | "draft" | "failed";
  txSignature?: string;
  pumpUrl?: string;
  metadataUri?: string;
  devBuyInSol?: number;
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
 * POST, server-side persist of a real launch.
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

  if (!body.walletPubkey || !body.mintPubkey || !body.ticker || !body.tokenName) {
    return NextResponse.json(
      { ok: false, error: "walletPubkey, mintPubkey, ticker, tokenName required" },
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
    .from("launches_v1")
    .upsert(
      {
        wallet_pubkey: body.walletPubkey,
        mint_pubkey: body.mintPubkey,
        ticker: body.ticker,
        token_name: body.tokenName,
        chain: body.chain ?? "solana",
        status: body.status ?? "launched",
        tx_signature: body.txSignature ?? null,
        pump_url: body.pumpUrl ?? null,
        metadata_uri: body.metadataUri ?? null,
        dev_buy_sol: body.devBuyInSol ?? null,
        mock: body.mock ?? false,
        source_x_url: body.sourceXUrl ?? null,
      },
      { onConflict: "mint_pubkey" },
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
 * GET, list launches.
 *
 * Two modes:
 *   ?wallet=<pubkey>  → only that wallet's launches (used by /dashboard,
 *                       'My Launches', wallet-scoped)
 *   (no wallet)       → ALL launches across all wallets, newest first.
 *                       Used by /launches ('All Launches'), the public
 *                       discovery surface, like Pump.fun's homepage.
 *                       Capped at 200 so the response stays bounded.
 *
 * Without Supabase, returns an empty list (the client will fall back to
 * its own localStorage in the wallet-scoped case; the public-all view
 * just shows nothing until Supabase is wired up).
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
    .from("launches_v1")
    .select("*")
    .eq("mock", false) // public board: never expose mock rows
    .eq("status", "launched") // only show actually-shipped tokens
    .order("created_at", { ascending: false })
    .limit(200);

  if (wallet) {
    query = query.eq("wallet_pubkey", wallet);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true, launches: data ?? [] });
}

/**
 * DELETE ?wallet=<pubkey>, clear all launch history rows for a wallet.
 *
 * Onchain tokens themselves are immutable, this only removes the rows
 * KOKi has tracked. The user's dashboard goes back to an empty state.
 *
 * Without Supabase, this still returns ok:true so the client can clear
 * its localStorage even when there's no server-side state to clean.
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
    .from("launches_v1")
    .delete({ count: "exact" })
    .eq("wallet_pubkey", wallet);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true, deleted: count ?? 0 });
}
