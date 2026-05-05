import { NextResponse, type NextRequest } from "next/server";

// Server-side proxy that fetches a Pump.fun token's live state
// (market cap, bonding-curve progress, holders, etc.) so the gallery
// cards can show real numbers without each browser hitting Pump.fun's
// frontend API directly (which blocks cross-origin requests).
//
// We only forward a small, sanitized subset of fields the UI actually
// needs — keeps the payload tiny and avoids leaking unstable internals.

export const runtime = "nodejs";

const PUMP_FUN_API = "https://frontend-api.pump.fun/coins";

interface PumpCoin {
  mint: string;
  marketCapUsd: number | null;
  marketCapSol: number | null;
  bondingProgress: number | null; // 0..1
  complete: boolean; // graduated to Raydium
  holders: number | null;
  symbol: string | null;
  name: string | null;
}

interface PumpCoinResponse {
  ok: boolean;
  coin?: PumpCoin;
  error?: string;
}

// In-memory short-circuit so simultaneous card renders don't all stampede
// the upstream. Lambda instances are short-lived but a 60s window covers
// the burst of parallel fetches when the gallery first mounts.
const cache = new Map<string, { at: number; coin: PumpCoin }>();
const TTL_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return NextResponse.json<PumpCoinResponse>(
      { ok: false, error: "Invalid mint address" },
      { status: 400 },
    );
  }

  const hit = cache.get(mint);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json<PumpCoinResponse>({ ok: true, coin: hit.coin });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${PUMP_FUN_API}/${mint}`, {
      headers: {
        // Pump.fun's frontend-api 403s a bare fetch — identify ourselves.
        "User-Agent": "KOKi-agent/1.0 (+https://kokiai.app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json<PumpCoinResponse>(
      { ok: false, error: `Network: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json<PumpCoinResponse>(
      { ok: false, error: `Pump.fun ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const raw = (await upstream.json()) as Record<string, unknown>;

  // Pump.fun's bonding curve is "complete" when the token has graduated
  // to Raydium. Until then, market cap rises along the curve. We compute
  // a 0..1 progress ratio from the virtual reserves — Pump.fun's own UI
  // does the same thing.
  const mcUsd = numOrNull(raw.usd_market_cap);
  const mcSol = numOrNull(raw.market_cap);
  const complete = Boolean(raw.complete);
  const bondingProgress = complete ? 1 : computeProgress(raw);
  const holders = numOrNull(raw.holders) ?? numOrNull(raw.holder_count);

  const coin: PumpCoin = {
    mint,
    marketCapUsd: mcUsd,
    marketCapSol: mcSol,
    bondingProgress,
    complete,
    holders,
    symbol: typeof raw.symbol === "string" ? (raw.symbol as string) : null,
    name: typeof raw.name === "string" ? (raw.name as string) : null,
  };

  cache.set(mint, { at: Date.now(), coin });
  return NextResponse.json<PumpCoinResponse>({ ok: true, coin });
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

// Pump.fun bonding curve graduates when ~85 SOL of buying pressure has
// flowed in. We approximate progress from real_sol_reserves (the SOL
// that's actually accumulated, not virtual). Falls back to null on shape
// changes so we don't render a wrong number.
function computeProgress(raw: Record<string, unknown>): number | null {
  const real = numOrNull(raw.real_sol_reserves);
  if (real === null) return null;
  // 30 SOL initial virtual + ~85 SOL to graduate ≈ 85 SOL of real flow.
  // Pump.fun shows the same ratio in their UI's "bonding curve progress".
  const ratio = real / 85;
  if (!Number.isFinite(ratio) || ratio < 0) return 0;
  return Math.min(1, ratio);
}
