"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Rocket, Search, Filter, ArrowUpRight, Loader2 } from "lucide-react";

// Pump.fun-style token board. Grid of cards, three sort tabs
// (New / Trending / About to graduate), search box, live-refresh every
// 20s. No marketing sections above or below — the grid IS the page.
//
// Data comes from /api/launches. When Supabase isn't wired up the API
// returns an empty list; we render an empty state that funnels straight
// to the launch flow instead of a "coming soon" pretense.

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

type Sort = "new" | "trending" | "graduating";

const REFRESH_MS = 20_000;

export default function BoardGrid() {
  const [items, setItems] = useState<PublicLaunch[] | null>(null);
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
        setItems(json.launches ?? []);
        setError(null);
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
    // Sort variants — until we index live pool progress, "trending" and
    // "graduating" fall back to newest-first (same as `new`). They stay
    // in the UI so the tabs feel right, and get real ordering in a
    // follow-up once the indexer populates a `graduation_progress` col.
    if (sort === "trending" || sort === "graduating" || sort === "new") {
      out.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return out;
  }, [items, q, sort]);

  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
      {/* Controls row: tabs + search — matches Pump.fun's board header */}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered!.map((l, i) => (
            <TokenCard key={l.token_address} launch={l} idx={i} />
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
      <button
        type="button"
        title="Sort filters coming soon"
        className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-300/60 hover:text-ink-300 hover:bg-ink-1000/10"
      >
        <Filter className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─────────── card ─────────── */

function TokenCard({ launch, idx }: { launch: PublicLaunch; idx: number }) {
  return (
    <Link
      href={`/launches/${launch.token_address}`}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 20) * 40}ms` }}
    >
      <div className="aspect-square w-full bg-koki-500 overflow-hidden relative border-b border-[var(--border-strong)]">
        {launch.logo_url ? (
          <Image
            src={launch.logo_url}
            alt={launch.token_name}
            fill
            sizes="220px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-ink-1000 font-black text-[clamp(20px,3.5vw,36px)] tracking-tight">
              ${launch.ticker}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="text-[13px] font-black tracking-tight truncate">
            {launch.token_name}
          </div>
          <span className="text-[10px] font-extrabold text-ink-300/60 shrink-0">
            ${launch.ticker}
          </span>
        </div>
        <div className="text-[10px] text-ink-300/50 font-mono truncate">
          {launch.token_address.slice(0, 6)}…{launch.token_address.slice(-4)}
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-1.5">
          <span className="text-[10px] text-ink-300/50 font-bold">
            {relative(launch.created_at)}
          </span>
          {launch.pons_url && (
            <a
              href={launch.pons_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-300/72 hover:text-ink-300 hover:underline"
            >
              Pons <ArrowUpRight className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─────────── states ─────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="card !p-0 overflow-hidden animate-pulse">
          <div className="aspect-square w-full bg-koki-500/25 border-b border-[var(--border-strong)]" />
          <div className="p-3 space-y-1.5">
            <div className="h-3 bg-ink-1000/10 rounded w-3/4" />
            <div className="h-2 bg-ink-1000/10 rounded w-1/2" />
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
        Every token the HAMR agent ships on Pons lands here in real time.
        Run Auto-pilot or bring your own idea to seed the board.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/launch" className="btn btn-primary !py-2.5 !px-4 !text-sm">
          <Rocket className="h-4 w-4" />
          Launch a coin
        </Link>
        <a
          href="https://www.ponsfamily.com/launchpad"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary !py-2.5 !px-4 !text-sm"
        >
          Browse Pons
        </a>
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
