import { NextResponse } from "next/server";
import { formatEther, type Address } from "viem";
import { getPublicClient } from "@/lib/robinhood/client";
import { readTokenMeta } from "@/lib/hamr/read";
import { HIDDEN_TOKENS } from "@/lib/hamr/constants";
import {
  HAMR_V2,
  launchpadV2Abi,
  tokenLaunchedV2Event,
  poolSwapEvent,
  readV2Snapshot,
  tokenIsToken0,
} from "@/lib/hamr/v2";
import { getSupabaseAdmin, supabaseEnabled } from "@/lib/supabase/server";

// /api/board — the ENTIRE home board in one cached payload.
//
// Before this, every visitor's browser individually rebuilt the board
// from dozens of RPC reads (token list, metadata ×8 per token, slot0,
// swap logs, block timestamps) and the board rendered only after ALL
// of it resolved — seconds of blank grid per visit. Now the server
// assembles it once, keeps it warm for ~12s in memory, and Vercel's
// edge caches it too. Visitors get one small JSON and paint instantly.

export const runtime = "nodejs";
export const maxDuration = 30;

interface BoardItem {
  token_address: string;
  ticker: string;
  token_name: string;
  logo_url: string | null;
  wallet_address: string;
  source_x_url: string | null;
  created_at: string;
  mcapEth: number | null;
  progressBps: number | null;
  graduated: boolean;
  vol24hEth: number;
}

let cache: { at: number; body: { ok: true; items: BoardItem[] } } | null = null;
const TTL_MS = 12_000;
let building: Promise<{ ok: true; items: BoardItem[] }> | null = null;

async function build(): Promise<{ ok: true; items: BoardItem[] }> {
  const client = getPublicClient();

  // Factory launches: token + pool + birth block, one log scan.
  const launchLogs = await client.getLogs({
    address: HAMR_V2.launchpad,
    event: tokenLaunchedV2Event,
    fromBlock: 0n,
    toBlock: "latest",
  });
  const launches = launchLogs
    .map((l) => ({
      token: (l.args as { token?: Address }).token,
      pool: (l.args as { pool?: Address }).pool,
      block: l.blockNumber,
    }))
    .filter(
      (x): x is { token: Address; pool: Address; block: bigint } =>
        Boolean(x.token && x.pool) &&
        !HIDDEN_TOKENS.has(x.token!.toLowerCase()),
    );

  // Birth timestamps.
  const uniqBlocks = [...new Set(launches.map((l) => l.block))];
  const tsEntries = await Promise.all(
    uniqBlocks.map(async (bn) => {
      try {
        const b = await client.getBlock({ blockNumber: bn });
        return [bn.toString(), Number(b.timestamp)] as const;
      } catch {
        return [bn.toString(), 0] as const;
      }
    }),
  );
  const tsOf = new Map(tsEntries);

  // DB enrichment (source X links) — best effort.
  const sourceX = new Map<string, string>();
  if (supabaseEnabled()) {
    try {
      const sb = getSupabaseAdmin();
      if (sb) {
        const { data } = await sb
          .from("pons_launches")
          .select("token_address, source_x_url")
          .not("source_x_url", "is", null);
        for (const r of data ?? []) {
          if (r.token_address && r.source_x_url)
            sourceX.set(String(r.token_address).toLowerCase(), r.source_x_url);
        }
      }
    } catch {
      /* enrichment only */
    }
  }

  const cutoff = Math.floor(Date.now() / 1000) - 86_400;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // SEQUENTIAL per token — the public RPC rate-limits bursts (HTTP 429
  // when the whole board was fetched in parallel). One token at a time
  // with a small breather keeps every rebuild comfortably under the
  // limit; the 12s cache means this cost is paid once, not per visitor.
  const items: BoardItem[] = [];
  for (const { token, pool, block } of launches) {
    const meta = await readTokenMeta(token).catch(() => null);
    const snap = await readV2Snapshot(token).catch(() => null);
    const swaps = await client
      .getLogs({
        address: pool,
        event: poolSwapEvent,
        fromBlock: 0n,
        toBlock: "latest",
      })
      .catch(() => []);

    // 24h ETH volume; timestamps only for recent blocks (bounded).
    let vol = 0;
    const is0 = tokenIsToken0(token);
    const swapBlocks = [...new Set(swaps.map((s) => s.blockNumber))].slice(-60);
    const sTs = new Map<string, number>();
    for (const bn of swapBlocks) {
      try {
        const b = await client.getBlock({ blockNumber: bn });
        sTs.set(bn.toString(), Number(b.timestamp));
      } catch {
        sTs.set(bn.toString(), 0);
      }
    }
    for (const s of swaps) {
      const ts = sTs.get(s.blockNumber.toString()) ?? 0;
      if (ts < cutoff) continue;
      const a = s.args as { amount0?: bigint; amount1?: bigint };
      const w = is0 ? a.amount1 : a.amount0;
      if (typeof w !== "bigint") continue;
      vol += Math.abs(Number(formatEther(w)));
    }

    const born = tsOf.get(block.toString()) ?? 0;
    items.push({
      token_address: token,
      ticker: meta?.symbol ?? "?",
      token_name: meta?.name ?? token.slice(0, 8),
      logo_url: meta?.logo || null,
      wallet_address: meta?.creator ?? "",
      source_x_url: sourceX.get(token.toLowerCase()) ?? null,
      created_at: born ? new Date(born * 1000).toISOString() : "",
      mcapEth: snap ? snap.priceEth * snap.circulating : null,
      progressBps: snap ? snap.progressBps : null,
      graduated: snap ? snap.graduated : false,
      vol24hEth: vol,
    });
    await sleep(120);
  }

  // Newest first.
  items.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  const dbg = (globalThis as { __boardErr?: string }).__boardErr;
  return { ok: true as const, items, ...(dbg ? { debug: dbg } : {}) } as {
    ok: true;
    items: BoardItem[];
  };
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, {
      headers: {
        "cache-control": "public, s-maxage=10, stale-while-revalidate=60",
      },
    });
  }
  // Coalesce concurrent builds into one.
  if (!building) {
    building = build()
      .then((body) => {
        cache = { at: Date.now(), body };
        return body;
      })
      .finally(() => {
        building = null;
      });
  }
  try {
    const body = await building;
    return NextResponse.json(body, {
      headers: {
        "cache-control": "public, s-maxage=10, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    // Serve stale cache over an error any day.
    if (cache) return NextResponse.json(cache.body);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "board build failed" },
      { status: 502 },
    );
  }
}
