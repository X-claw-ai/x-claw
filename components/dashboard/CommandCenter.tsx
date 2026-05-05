"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, ExternalLink, ArrowUpRight, Trash2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Badge } from "@/components/ui/Badge";
import {
  readLaunches,
  clearLaunchesEverywhere,
  type SavedLaunch,
} from "@/lib/storage/launches";

// Pump.fun-style dashboard: AI-agent-launched tokens are the primary
// content. Top stats stay for quick context, everything else (the old
// Attention / Community / Execution phases) was either redundant with
// the /launch wizard or repeated info already on this page.
// Comma-separated list of admin wallet pubkeys allowed to wipe history.
// Set NEXT_PUBLIC_KOKI_ADMIN_WALLETS in Vercel to your own wallet pubkey
// so only you see the dashboard "Clear all" button. Other users — even when
// connected — never see it. (Server-side DELETE is still wallet-scoped, so
// this is purely UI hardening.)
const ADMIN_WALLETS = new Set(
  (process.env.NEXT_PUBLIC_KOKI_ADMIN_WALLETS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export default function CommandCenter() {
  const [launches, setLaunches] = useState<SavedLaunch[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [clearing, setClearing] = useState(false);
  const { publicKey } = useWallet();
  const isAdmin = Boolean(
    publicKey && ADMIN_WALLETS.has(publicKey.toBase58()),
  );

  useEffect(() => {
    setLaunches(readLaunches());
    setHydrated(true);
  }, []);

  const liveLaunches = launches.filter(
    (l) => !l.mock && l.status === "launched",
  );

  async function handleClearAll() {
    const count = launches.length;
    if (count === 0) return;
    const ok = window.confirm(
      `Clear all ${count} launch record${count === 1 ? "" : "s"} from your KOKi history?\n\n` +
        "On-chain tokens themselves stay live on Solana — this only wipes " +
        "what KOKi displays in your dashboard.",
    );
    if (!ok) return;

    setClearing(true);
    const wallet = publicKey?.toBase58();
    const res = await clearLaunchesEverywhere(wallet);
    setLaunches([]);
    setClearing(false);

    if (res.serverDeleted > 0) {
      window.alert(
        `Cleared. ${res.serverDeleted} record${res.serverDeleted === 1 ? "" : "s"} removed from server, local cache wiped.`,
      );
    }
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Token gallery */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <span className="eyebrow !text-[10px] opacity-65">
              AGENT-LAUNCHED TOKENS
            </span>
            <h2 className="text-[26px] md:text-[30px] font-black tracking-tight mt-1">
              Tokens shipped by KOKi agents
            </h2>
            <p className="text-[13px] text-ink-1000/70 mt-1 font-medium max-w-xl">
              Every memecoin launched through the KOKi agent — name, ticker,
              mint, and the meme art that shipped to Pump.fun. Click any card
              to open the live monitor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hydrated && isAdmin && launches.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="btn btn-secondary !py-2.5 !px-3 !text-xs disabled:opacity-50"
                aria-label="Clear all launch history"
                title="Admin: clear all launch history (on-chain tokens stay live)"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {clearing ? "Clearing…" : "Clear all"}
              </button>
            )}
            <Link href="/launch" className="btn btn-primary !py-2.5 !px-4 !text-sm">
              <Rocket className="h-4 w-4" />
              New launch
            </Link>
          </div>
        </div>

        {!hydrated ? (
          <SkeletonGrid />
        ) : liveLaunches.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {liveLaunches.map((l, i) => (
              <TokenCard key={l.id} launch={l} idx={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────── token card with lazy meme image ─────────── */

function TokenCard({ launch, idx = 0 }: { launch: SavedLaunch; idx?: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!launch.metadataUri) return;

    // Resolve the meme image once per token and cache it locally so the
    // dashboard doesn't refetch on every visit. metadataUri points at a
    // Pump.fun IPFS JSON whose `image` field is the actual asset URL.
    const cacheKey = `koki:img:${launch.mintPubkey || launch.id}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        setImgUrl(cached);
        return;
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;
    fetch(launch.metadataUri, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((meta) => {
        if (cancelled) return;
        const url = meta && typeof meta.image === "string" ? meta.image : null;
        if (url) {
          setImgUrl(url);
          try {
            window.localStorage.setItem(cacheKey, url);
          } catch {
            /* quota — ignore */
          }
        }
      })
      .catch(() => {
        /* network — fallback handled by render below */
      });

    return () => {
      cancelled = true;
    };
  }, [launch.metadataUri, launch.mintPubkey, launch.id]);

  const monitorHref = launch.mintPubkey
    ? `/launches/${launch.mintPubkey}`
    : "/launches";

  return (
    <Link
      href={monitorHref}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 12) * 60}ms` }}
    >
      {/* Meme image / fallback tile */}
      <div className="aspect-square w-full bg-koki-500 overflow-hidden relative border-b-[1.5px] border-ink-1000">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={launch.tokenName}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-ink-1000 font-black text-[clamp(20px,4vw,40px)] tracking-tight">
              ${launch.ticker}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="text-[14px] font-black tracking-tight truncate">
            {launch.tokenName}
          </div>
          <span className="text-[10px] font-extrabold text-ink-1000/65 shrink-0">
            ${launch.ticker}
          </span>
        </div>
        <div className="text-[10px] text-ink-1000/55 font-mono truncate">
          {shortAddr(launch.mintPubkey || "—")}
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <Badge tone="live" className="!h-[18px] !text-[9px] !px-2">
            Launched
          </Badge>
          <span className="text-[10px] text-ink-1000/55 font-bold">
            {new Date(launch.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        {launch.pumpUrl && (
          <a
            href={launch.pumpUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-1000/72 hover:text-ink-1000 hover:underline"
          >
            Pump.fun <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </Link>
  );
}

/* ─────────── states ─────────── */

function EmptyState() {
  return (
    <div className="card !p-10 text-center">
      <div className="text-[20px] font-black tracking-tight">
        No agent launches yet
      </div>
      <p className="text-[13px] text-ink-1000/70 mt-2 max-w-md mx-auto font-medium">
        Send a prompt or hit Auto-pilot, and the KOKi agent will draft and
        ship a memecoin to Pump.fun. Every coin you launch shows up here.
      </p>
      <Link
        href="/launch"
        className="btn btn-primary !py-2.5 !px-4 !text-sm mt-6 inline-flex"
      >
        Launch your first
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card !p-0 overflow-hidden animate-pulse">
          <div className="aspect-square w-full bg-koki-500/40 border-b-[1.5px] border-ink-1000" />
          <div className="p-3.5 space-y-2">
            <div className="h-3.5 bg-ink-1000/10 rounded w-3/4" />
            <div className="h-2.5 bg-ink-1000/10 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function shortAddr(addr: string): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
}
