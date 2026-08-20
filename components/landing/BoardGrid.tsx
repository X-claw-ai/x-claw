"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Rocket, Search, ArrowUpRight, Loader2, Crown, Flame } from "lucide-react";
import { readTokenMeta, fetchEthUsd, formatUsd, HIDDEN_TOKENS } from "@/lib/hamr";
import {
  HAMR_V2,
  listV2Tokens,
  readV2Snapshot,
  tokenLaunchedV2Event,
  poolSwapEvent,
  tokenIsToken0,
} from "@/lib/hamr/v2";
import { getPublicClient } from "@/lib/robinhood/client";
import { formatEther } from "viem";

// Pump.fun-style token board — v2: every coin IS a real Uniswap V3
// pool. The list comes straight from the v2 factory, prices from each
// pool's slot0, and 24h volume from the pools' own Swap events.
//
// DB rows from /api/launches only enrich cards (source-X link); the
// chain is the sole source of truth for what exists.

interface PublicLaunch {
  token_address: string;
  pool_address: string | null;
  ticker: string;
  token_name: string;
  logo_url: string | null;
  wallet_address: string;
  pons_url: string | null;
  explorer_url: string | null;
  source_x_url: string | null;
  created_at: string;
}

interface Market {
  mcapEth: number;
  progressBps: number;
  graduated: boolean;
}

type Sort = "new" | "oldest" | "mcap" | "volume" | "graduating";

const REFRESH_MS = 45_000;
const MARKET_LIMIT = 36; // how many cards get live curve reads

export default function BoardGrid() {
  const [items, setItems] = useState<PublicLaunch[] | null>(null);
  const [markets, setMarkets] = useState<Record<string, Market>>({});
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [q, setQ] = useState("");
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [vol24h, setVol24h] = useState<Record<string, number>>({});

  // 24h volume per token — one Swap-log scan per pool (v2: every coin
  // has its own real Uniswap pool). Cheap while the chain is young.
  useEffect(() => {
    let cancelled = false;
    async function scan() {
      try {
        const client = getPublicClient();
        // token → pool map straight from the factory's launch events.
        const launches = await client.getLogs({
          address: HAMR_V2.launchpad,
          event: tokenLaunchedV2Event,
          fromBlock: 0n,
          toBlock: "latest",
        });
        const pairs = launches
          .map((l) => {
            const a = l.args as { token?: string; pool?: string };
            return a.token && a.pool
              ? { token: a.token as `0x${string}`, pool: a.pool as `0x${string}` }
              : null;
          })
          .filter((x): x is { token: `0x${string}`; pool: `0x${string}` } => x !== null)
          .slice(-24); // newest pools only — bounded RPC load

        const perPool = await Promise.all(
          pairs.map(async ({ token, pool }) => {
            try {
              const swaps = await client.getLogs({
                address: pool,
                event: poolSwapEvent,
                fromBlock: 0n,
                toBlock: "latest",
              });
              return { token, swaps };
            } catch {
              return { token, swaps: [] };
            }
          }),
        );
        if (cancelled) return;

        const allBlocks = [
          ...new Set(perPool.flatMap((p) => p.swaps.map((s) => s.blockNumber))),
        ].slice(-150);
        const tsEntries = await Promise.all(
          allBlocks.map(async (bn) => {
            try {
              const b = await client.getBlock({ blockNumber: bn });
              return [bn.toString(), Number(b.timestamp)] as const;
            } catch {
              return [bn.toString(), 0] as const;
            }
          }),
        );
        if (cancelled) return;
        const tsMap = new Map(tsEntries);
        const cutoff = Math.floor(Date.now() / 1000) - 86_400;

        const out: Record<string, number> = {};
        for (const { token, swaps } of perPool) {
          const is0 = tokenIsToken0(token);
          let vol = 0;
          for (const s of swaps) {
            const ts = tsMap.get(s.blockNumber.toString()) ?? 0;
            if (ts < cutoff) continue;
            const a = s.args as { amount0?: bigint; amount1?: bigint };
            const wethDelta = is0 ? a.amount1 : a.amount0;
            if (typeof wethDelta !== "bigint") continue;
            vol += Math.abs(Number(formatEther(wethDelta)));
          }
          if (vol > 0) out[token.toLowerCase()] = vol;
        }
        setVol24h(out);
      } catch {
        /* volume sort degrades gracefully */
      }
    }
    void scan();
    const id = setInterval(scan, 120_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = () =>
      fetchEthUsd().then((p) => {
        if (!cancelled && p) setEthUsd(p);
      });
    void tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Chain FIRST — the v2 factory is the sole source of truth for
        // what exists. (v1 curve tokens are legacy and stay off-board.)
        const onchain = await listV2Tokens(36);
        const visible = onchain.filter(
          (t) => !HIDDEN_TOKENS.has(t.toLowerCase()),
        );

        // DB enrichment only (source-X link, site URLs) — best-effort.
        const dbMap = new Map<string, PublicLaunch>();
        try {
          const r = await fetch("/api/launches", { cache: "no-store" });
          const json = (await r.json()) as {
            ok?: boolean;
            launches?: PublicLaunch[];
          };
          if (r.ok && json.ok) {
            for (const l of json.launches ?? []) {
              dbMap.set(l.token_address.toLowerCase(), l);
            }
          }
        } catch {
          /* DB down — chain data still renders everything that matters */
        }

        // Birth timestamps straight from the factory's TokenLaunched
        // events. One scan covers every token.
        const bornAt = new Map<string, string>();
        try {
          const client = getPublicClient();
          const logs = await client.getLogs({
            address: HAMR_V2.launchpad,
            event: tokenLaunchedV2Event,
            fromBlock: 0n,
            toBlock: "latest",
          });
          const blockOf = new Map<string, bigint>();
          for (const l of logs) {
            const tok = (l.args as { token?: string }).token;
            if (tok) blockOf.set(tok.toLowerCase(), l.blockNumber);
          }
          const uniqBlocks = [...new Set([...blockOf.values()])];
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
          const tsOfBlock = new Map(tsEntries);
          for (const [t, bn] of blockOf) {
            const ts = tsOfBlock.get(bn.toString()) ?? 0;
            if (ts > 0) bornAt.set(t, new Date(ts * 1000).toISOString());
          }
        } catch {
          /* timestamps stay unknown — cards fall back gracefully */
        }

        // One card per on-chain token; metadata lives ON the token.
        const cards = await Promise.all(
          visible.map(async (t) => {
            const key = t.toLowerCase();
            const db = dbMap.get(key);
            try {
              const meta = await readTokenMeta(t);
              return {
                token_address: t,
                pool_address: db?.pool_address ?? null,
                ticker: meta.symbol,
                token_name: meta.name,
                logo_url: meta.logo || db?.logo_url || null,
                wallet_address: meta.creator,
                pons_url: db?.pons_url ?? null,
                explorer_url: db?.explorer_url ?? null,
                source_x_url: db?.source_x_url ?? null,
                created_at: bornAt.get(key) ?? db?.created_at ?? "",
              } satisfies PublicLaunch;
            } catch {
              return db ?? null;
            }
          }),
        );
        if (cancelled) return;
        const launches = cards.filter((x): x is PublicLaunch => x !== null);
        setItems(launches);
        setError(null);

        // Live pool reads — fire-and-forget per token, merge as they land.
        launches.slice(0, MARKET_LIMIT).forEach((l) => {
          readV2Snapshot(l.token_address as `0x${string}`)
            .then((s) => {
              if (cancelled || !s) return;
              setMarkets((m) => ({
                ...m,
                [l.token_address.toLowerCase()]: {
                  mcapEth: s.priceEth * s.circulating,
                  progressBps: s.progressBps,
                  graduated: s.graduated,
                },
              }));
            })
            .catch(() => {
              /* RPC hiccup — card just shows without numbers */
            });
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    let out = items.slice();
    if (needle) {
      out = out.filter(
        (l) =>
          l.token_name.toLowerCase().includes(needle) ||
          l.ticker.toLowerCase().includes(needle) ||
          l.token_address.toLowerCase().includes(needle),
      );
    }
    const mkt = (l: PublicLaunch) => markets[l.token_address.toLowerCase()];
    const ts = (l: PublicLaunch) =>
      l.created_at ? new Date(l.created_at).getTime() : 0;
    if (sort === "graduating") {
      // Section, not just a sort: only curves that are actually close
      // to graduation (>=50% of the 4 ETH raise) and not yet graduated.
      out = out.filter((l) => {
        const m = mkt(l);
        return m ? !m.graduated && m.progressBps >= 5_000 : false;
      });
      out.sort((a, b) => (mkt(b)?.progressBps ?? -1) - (mkt(a)?.progressBps ?? -1));
    } else if (sort === "volume") {
      // Only tokens that actually traded in the last 24h.
      out = out.filter((l) => (vol24h[l.token_address.toLowerCase()] ?? 0) > 0);
      out.sort(
        (a, b) =>
          (vol24h[b.token_address.toLowerCase()] ?? 0) -
          (vol24h[a.token_address.toLowerCase()] ?? 0),
      );
    } else if (sort === "mcap") {
      out.sort((a, b) => (mkt(b)?.mcapEth ?? -1) - (mkt(a)?.mcapEth ?? -1));
    } else if (sort === "oldest") {
      out.sort((a, b) => ts(a) - ts(b));
    } else {
      out.sort((a, b) => ts(b) - ts(a));
    }
    return out;
  }, [items, q, sort, markets, vol24h]);

  // Hottest coins: real 24h volume first, then curve progress, then mcap.
  const trending = useMemo(() => {
    if (!items || items.length === 0) return [];
    const score = (l: PublicLaunch) => {
      const key = l.token_address.toLowerCase();
      const m = markets[key];
      return {
        vol: vol24h[key] ?? 0,
        prog: m?.progressBps ?? 0,
        mcap: m?.mcapEth ?? 0,
      };
    };
    return items
      .slice()
      .sort((a, b) => {
        const sa = score(a);
        const sb = score(b);
        if (sb.vol !== sa.vol) return sb.vol - sa.vol;
        if (sb.prog !== sa.prog) return sb.prog - sa.prog;
        return sb.mcap - sa.mcap;
      })
      .slice(0, 4);
  }, [items, markets, vol24h]);

  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
      {/* Trending now — the hottest coins lead the page */}
      {trending.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-koki-400" />
            <h2 className="text-[15px] font-black tracking-tight">
              Trending now
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {trending.map((l) => (
              <TrendingCard
                key={l.token_address}
                launch={l}
                market={markets[l.token_address.toLowerCase()]}
                vol={vol24h[l.token_address.toLowerCase()] ?? 0}
                ethUsd={ethUsd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls row: tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <TabGroup value={sort} onChange={setSort} />
        <form
          className="flex items-center gap-2 min-w-0"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="relative flex items-center min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 text-ink-300/55" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token, ticker, or 0x…"
              className="input !py-2 !pl-8 !text-[12px] !h-9"
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary !py-2 !px-3 !text-xs shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>

      {items === null ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : filtered!.length === 0 ? (
        q ? (
          <EmptyResult label={`No token matches “${q}”.`} />
        ) : sort === "graduating" ? (
          <EmptyResult label="No token is close to graduation yet — 50%+ of the 4 ETH raise lands here." />
        ) : sort === "volume" ? (
          <EmptyResult label="No trades in the last 24h yet." />
        ) : (
          <EmptyBoard />
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {filtered!.map((l, i) => (
            <TokenCard
              key={l.token_address}
              launch={l}
              idx={i}
              market={markets[l.token_address.toLowerCase()]}
              ethUsd={ethUsd}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─────────── controls ─────────── */

function TabGroup({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (v: Sort) => void;
}) {
  const tabs: { key: Sort; label: string }[] = [
    { key: "new", label: "New" },
    { key: "oldest", label: "Oldest" },
    { key: "mcap", label: "Market cap" },
    { key: "volume", label: "Volume" },
    { key: "graduating", label: "About to graduate" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-bg-elevated p-0.5">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`px-3 py-1.5 text-[12px] font-extrabold tracking-tight rounded-md transition-colors ${
              active
                ? "bg-koki-500 text-ink-1000"
                : "text-ink-300/70 hover:text-ink-300 hover:bg-ink-1000/10"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── card ─────────── */

function TrendingCard({
  launch,
  market,
  vol,
  ethUsd,
}: {
  launch: PublicLaunch;
  market?: Market;
  vol: number;
  ethUsd: number | null;
}) {
  return (
    <Link
      href={`/launches/${launch.token_address}`}
      className="group relative h-[168px] w-[280px] shrink-0 rounded-2xl overflow-hidden border border-[var(--border)] hover:border-koki-500/60 transition-colors"
    >
      {launch.logo_url ? (
        <Image
          src={launch.logo_url}
          alt={launch.token_name}
          fill
          sizes="280px"
          unoptimized
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-koki-600 to-koki-900">
          <span className="text-white font-black text-[30px] tracking-tight">
            ${launch.ticker}
          </span>
        </div>
      )}
      {/* Readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {vol > 0 && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-koki-300">
          <Flame className="h-2.5 w-2.5" />
          Hot
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="text-[18px] font-black tracking-tight text-white tabular-nums leading-none">
          {market
            ? ethUsd
              ? formatUsd(market.mcapEth * ethUsd)
              : `${fmtEth(market.mcapEth)} ETH`
            : "—"}
          <span className="ml-1 text-[10px] font-extrabold text-white/55">MC</span>
        </div>
        <div className="mt-1 text-[13px] font-black text-white truncate">
          {launch.token_name}{" "}
          <span className="text-[11px] font-extrabold text-white/60">
            ${launch.ticker}
          </span>
        </div>
      </div>
    </Link>
  );
}


function TokenCard({
  launch,
  idx,
  market,
  ethUsd,
}: {
  launch: PublicLaunch;
  idx: number;
  market?: Market;
  ethUsd: number | null;
}) {
  const pct = market ? market.progressBps / 100 : null;
  return (
    <Link
      href={`/launches/${launch.token_address}`}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 20) * 40}ms` }}
    >
      {/* Cover image — pump.fun style full-bleed square */}
      <div className="relative aspect-square w-full overflow-hidden bg-koki-500/20">
        {launch.logo_url ? (
          <Image
            src={launch.logo_url}
            alt={launch.token_name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 220px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-koki-600 to-koki-800">
            <span className="text-white font-black text-[clamp(18px,3vw,30px)] tracking-tight px-2 text-center break-all">
              ${launch.ticker}
            </span>
          </div>
        )}
        {market?.graduated && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-koki-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
            <Crown className="h-2.5 w-2.5" />
            Graduated
          </span>
        )}
        {launch.source_x_url && (
          <a
            href={launch.source_x_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold text-white/85 hover:text-white"
          >
            source <ArrowUpRight className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {/* Meta */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="min-w-0">
          <div className="text-[13.5px] font-black tracking-tight truncate leading-snug">
            {launch.token_name}
          </div>
          <div className="text-[11px] font-extrabold text-ink-300/50">
            ${launch.ticker}
          </div>
        </div>
        <div className="text-[13px] font-black tabular-nums text-emerald-400">
          {market
            ? ethUsd
              ? `${formatUsd(market.mcapEth * ethUsd)}`
              : `${fmtEth(market.mcapEth)} ETH`
            : "—"}{" "}
          <span className="text-[10px] font-extrabold text-ink-300/45">MC</span>
        </div>
        <div className="mt-auto pt-1 flex items-center justify-between gap-2 text-[10px] font-bold text-ink-300/50">
          <span className="font-mono truncate">
            {launch.wallet_address.slice(0, 4)}…{launch.wallet_address.slice(-4)}
          </span>
          <span className="shrink-0">
            {launch.created_at ? `${relative(launch.created_at)} ago` : "—"}
          </span>
        </div>
        {/* Graduation progress */}
        <div className="h-1 w-full rounded-full bg-ink-1000/10 overflow-hidden mt-1">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              market?.graduated ? "bg-koki-500" : "bg-emerald-500"
            }`}
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ─────────── states ─────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="card !p-0 overflow-hidden animate-pulse">
          <div className="aspect-square w-full bg-koki-500/15" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 bg-ink-1000/10 rounded w-3/4" />
            <div className="h-2.5 bg-ink-1000/10 rounded w-1/2" />
            <div className="h-1 bg-ink-1000/10 rounded w-full mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="card !p-10 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-koki-500 text-ink-1000 mb-5">
        <Rocket className="h-5 w-5" />
      </div>
      <div className="text-[20px] font-black tracking-tight">
        Board is empty. <span className="stamp">Be the first.</span>
      </div>
      <p className="text-[13px] text-ink-300/70 mt-2 max-w-md mx-auto font-medium">
        Every token launched on HAMR lands here in real time. Run
        Auto-pilot or bring your own idea to seed the board.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/launch" className="btn btn-primary !py-2.5 !px-4 !text-sm">
          <Rocket className="h-4 w-4" />
          Launch a coin
        </Link>
      </div>
    </div>
  );
}

function EmptyResult({ label }: { label: string }) {
  return (
    <div className="card !p-8 text-center text-[13px] text-ink-300/70 font-semibold">
      {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="card !p-6 !border-red-500/40 !bg-red-500/5 text-[12px] text-red-300 font-semibold flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      Board is still warming up: {message}
    </div>
  );
}

/* ─────────── helpers ─────────── */

function fmtEth(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function relative(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
