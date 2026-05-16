import { NextResponse, type NextRequest } from "next/server";

// Server-side proxy that fetches a Pump.fun token's live state
// (market cap, bonding-curve progress, holders, etc.) so the gallery
// cards can show real numbers without each browser hitting Pump.fun's
// frontend API directly (which blocks cross-origin requests).
//
// We only forward a small, sanitized subset of fields the UI actually
// needs, keeps the payload tiny and avoids leaking unstable internals.

export const runtime = "nodejs";

// Pump.fun has migrated their public coin endpoint at least twice.
// Try the newest first and fall back through older ones so we don't
// silently drop market caps when they cut over again.
const PUMP_FUN_ENDPOINTS = [
  "https://frontend-api-v3.pump.fun/coins",
  "https://frontend-api.pump.fun/coins",
  "https://swap-api.pump.fun/coins",
];

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
  /** Which endpoint actually answered (debug). */
  source?: string;
  /** Per-endpoint failures (debug). */
  attempts?: { endpoint: string; status: number; body: string }[];
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
    return NextResponse.json<PumpCoinResponse>({
      ok: true,
      coin: hit.coin,
      source: "cache",
    });
  }

  // Walk the known endpoints in order. First one that returns 200 with a
  // parseable body wins. Failures are stashed for debug exposure if all
  // three eventually fall through.
  let raw: Record<string, unknown> | null = null;
  let source: string | null = null;
  const attempts: { endpoint: string; status: number; body: string }[] = [];

  for (const base of PUMP_FUN_ENDPOINTS) {
    const url = `${base}/${mint}`;
    let upstream: Response;
    try {
      upstream = await fetch(url, {
        headers: {
          // Pump.fun gates a bare fetch, pretend to be a normal browser
          // so we get past the basic UA filter.
          "User-Agent":
            "Mozilla/5.0 (compatible; KOKi-agent/1.0; +https://kokiai.app)",
          Accept: "application/json, text/plain, */*",
          Origin: "https://pump.fun",
          Referer: "https://pump.fun/",
        },
        cache: "no-store",
      });
    } catch (err) {
      attempts.push({
        endpoint: base,
        status: 0,
        body: `Network: ${(err as Error).message}`,
      });
      continue;
    }

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      attempts.push({
        endpoint: base,
        status: upstream.status,
        body: text.slice(0, 200),
      });
      continue;
    }

    try {
      raw = (await upstream.json()) as Record<string, unknown>;
      source = base;
      break;
    } catch (err) {
      attempts.push({
        endpoint: base,
        status: upstream.status,
        body: `Parse error: ${(err as Error).message}`,
      });
      continue;
    }
  }

  if (!raw) {
    console.error(
      `[pump-coin] all endpoints failed for ${mint}: ${JSON.stringify(attempts)}`,
    );
    return NextResponse.json<PumpCoinResponse>(
      {
        ok: false,
        error: "All Pump.fun endpoints unreachable",
        attempts,
      },
      { status: 502 },
    );
  }

  // Pump.fun's bonding curve is "complete" when the token has graduated
  // to Raydium. Until then, market cap rises along the curve. We compute
  // a 0..1 progress ratio from the virtual reserves, Pump.fun's own UI
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
  return NextResponse.json<PumpCoinResponse>({
    ok: true,
    coin,
    source: source ?? undefined,
  });
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
