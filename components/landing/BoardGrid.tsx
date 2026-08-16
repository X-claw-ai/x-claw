"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Rocket, Search, ArrowUpRight, Loader2, Crown } from "lucide-react";
import {
  readCurve,
  readTokenMeta,
  listTokens,
  HAMR_CURVE,
  type HamrCurveState,
} from "@/lib/hamr";
import { formatEther } from "viem";

// Pump.fun-style token board. Dense horizontal cards with LIVE on-chain
// numbers (market cap, graduation progress) pulled straight from the
// bonding curve contract, three sort tabs, search, 20s refresh.
//
// Card data comes from /api/launches (name/logo/links); market data is
// read client-side from the curve so the board always shows real state
// even before any indexer exists.

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

type Sort = "new" | "trending" | "graduating";

const REFRESH_MS = 20_000;
const MARKET_LIMIT = 36; // how many cards get live curve reads

export default function BoardGrid() {
  const [items, setItems] = useState<PublicLaunch[] | null>(null);
  const [markets, setMarkets] = useState<Record<string, Market>>({});
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/launches", { cache: "no-store" });
        const json = (await r.json()) as {
          ok?: boolean;
          launches?: PublicLaunch[];
        };
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setError(`Failed to load launches (${r.status})`);
          return;
        }
        let launches = json.launches ?? [];

        // DB only knows launches made through the site. The chain is the
        // source of truth — pull any token the DB missed straight from
        // the factory so the board never lies.
        try {
          const onchain = await listTokens(24);
          const known = new Set(launches.map((l) => l.token_address.toLowerCase()));
          const missing = onchain.filter((t) => !known.has(t.toLowerCase()));
          const extras = await Promise.all(
            missing.map(async (t) => {
              try {
                const meta = await readTokenMeta(t);
                return {
                  token_address: t,
                  pool_address: null,
                  ticker: meta.symbol,
                  token_name: meta.name,
                  logo_url: meta.logo || null,
                  wallet_address: meta.creator,
                  pons_url: null,
                  explorer_url: null,
                  source_x_url: null,
                  created_at: "",
                } satisfies PublicLaunch;
              } catch {
                return null;
              }
            }),
          );
          launches = [
            ...launches,
            ...extras.filter((x): x is PublicLaunch => x !== null),
          ];
        } catch {
          /* RPC down — DB list still renders */
        }

        if (cancelled) return;
        setItems(launches);
        setError(null);

        // Live curve reads — fire-and-forget per token, merge as they land.
        launches.slice(0, MARKET_LIMIT).forEach((l) => {
          readCurve(l.token_address as `0x${string}`)
            .then((c: HamrCurveState) => {
              if (cancelled || !c.exists) return;
              const vEth = Number(formatEther(c.virtualEth));
              const vTok = Number(c.virtualToken) / 1e18;
              const price = vTok > 0 ? vEth / vTok : 0;
              const raised = Number(formatEther(c.realEth));
              setMarkets((m) => ({
                ...m,
                [l.token_address.toLowerCase()]: {
                  mcapEth: price * HAMR_CURVE.totalSupply,
                  progressBps: c.graduated
                    ? 10_000
                    : Math.min(
                        10_000,
                        Math.round(
                          (raised / HAMR_CURVE.graduationRaiseEth) * 10_000,
                        ),
                      ),
                  graduated: c.graduated,
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
    if (sort === "graduating") {
      out.sort((a, b) => (mkt(b)?.progressBps ?? -1) - (mkt(a)?.progressBps ?? -1));
    } else if (sort === "trending") {
      out.sort((a, b) => (mkt(b)?.mcapEth ?? -1) - (mkt(a)?.mcapEth ?? -1));
    } else {
      out.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return out;
  }, [items, q, sort, markets]);

  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
      {/* Controls row: tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <TabGroup value={sort} onChange={setSort} />
        <div className="flex items-center gap-2 min-w-0">
          <label className="relative flex items-center min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 text-ink-300/55" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token, ticker, or 0x…"
              className="input !py-2 !pl-8 !text-[12px] !h-9"
            />
          </label>
          <Link
            href="/launch"
            className="btn btn-primary !py-2 !px-3 !text-xs shrink-0"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Launch</span>
          </Link>
        </div>
      </div>

      {items === null ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorPanel message={error} />
      ) : filtered!.length === 0 ? (
        q ? (
          <EmptyResult label={`No token matches “${q}”.`} />
        ) : (
          <EmptyBoard />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered!.map((l, i) => (
            <TokenCard
              key={l.token_address}
              launch={l}
              idx={i}
              market={markets[l.token_address.toLowerCase()]}
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
    { key: "trending", label: "Trending" },
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

function TokenCard({
  launch,
  idx,
  market,
}: {
  launch: PublicLaunch;
  idx: number;
  market?: Market;
}) {
  const pct = market ? market.progressBps / 100 : null;
  return (
    <Link
      href={`/launches/${launch.token_address}`}
      className="card card-hover group flex gap-3 overflow-hidden !p-3 launch-card-anim relative"
      style={{ animationDelay: `${Math.min(idx, 20) * 40}ms` }}
    >
      {/* Logo */}
      <div className="relative h-[88px] w-[88px] shrink-0 rounded-xl overflow-hidden bg-koki-500 border border-[var(--border-strong)]">
        {launch.logo_url ? (
          <Image
            src={launch.logo_url}
            alt={launch.token_name}
            fill
            sizes="88px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-ink-1000 font-black text-[15px] tracking-tight px-1 text-center break-all">
              ${launch.ticker}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="text-[13.5px] font-black tracking-tight truncate leading-snug">
              {launch.token_name}{" "}
              <span className="text-[11px] font-extrabold text-ink-300/55">
                (${launch.ticker})
              </span>
            </div>
            <div className="mt-0.5 text-[10.5px] font-bold text-ink-300/55">
              by{" "}
              <span className="font-mono">
                {launch.wallet_address.slice(0, 4)}…
                {launch.wallet_address.slice(-4)}
              </span>
              {launch.created_at ? ` · ${relative(launch.created_at)} ago` : " · on-chain"}
            </div>
          </div>
          {market?.graduated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-koki-500 text-ink-1000 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0">
              <Crown className="h-2.5 w-2.5" />
              Graduated
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-emerald-600">
              {market ? `MC ${fmtEth(market.mcapEth)} ETH` : " "}
            </span>
            {launch.source_x_url ? (
              <a
                href={launch.source_x_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-ink-300/60 hover:text-ink-300 hover:underline"
              >
                source <ArrowUpRight className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="text-[10px] font-bold text-ink-300/40">
                {pct !== null ? `${pct.toFixed(0)}%` : ""}
              </span>
            )}
          </div>
          {/* Graduation progress */}
          <div className="h-1.5 w-full rounded-full bg-ink-1000/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${
                market?.graduated ? "bg-koki-500" : "bg-emerald-500"
              }`}
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────── states ─────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="card !p-3 flex gap-3 animate-pulse">
          <div className="h-[88px] w-[88px] rounded-xl bg-koki-500/25 shrink-0" />
          <div className="flex-1 py-1 space-y-2">
            <div className="h-3.5 bg-ink-1000/10 rounded w-2/3" />
            <div className="h-2.5 bg-ink-1000/10 rounded w-1/2" />
            <div className="h-1.5 bg-ink-1000/10 rounded w-full mt-6" />
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
