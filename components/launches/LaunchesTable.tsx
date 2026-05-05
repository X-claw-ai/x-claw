"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { readLaunches, type SavedLaunch } from "@/lib/storage/launches";
import { MOCK_LAUNCH_HISTORY } from "@/lib/mock";

// Pump.fun-style launch history. Same card grid as the dashboard but
// scoped to the user's full history (incl. failed / pending) — staggered
// fade-in for movement, hover lift for tactile feel.
export default function LaunchesTable() {
  const [items, setItems] = useState<SavedLaunch[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const real = readLaunches();
    setItems(real.length > 0 ? real : (MOCK_LAUNCH_HISTORY as SavedLaunch[]));
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <SkeletonGrid />;
  }

  const showingMockOnly = items === MOCK_LAUNCH_HISTORY;

  return (
    <>
      {showingMockOnly && (
        <div className="card p-3 text-xs font-bold text-ink-1000 mb-4">
          No real launches yet — showing sample rows. Run the Pump Launch
          Agent to see your actual launches here.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((l, i) => (
          <LaunchCard key={l.id} launch={l} idx={i} />
        ))}
      </div>
    </>
  );
}

/* ─────────── card with lazy meme image + stagger fade-in ─────────── */

function LaunchCard({ launch, idx }: { launch: SavedLaunch; idx: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!launch.metadataUri) return;

    // Cache resolved image URL per-mint so the page doesn't refetch every
    // visit. Same scheme the dashboard gallery uses.
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
            /* ignore */
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [launch.metadataUri, launch.mintPubkey, launch.id]);

  const monitorHref = launch.mintPubkey
    ? `/launches/${launch.mintPubkey}`
    : "#";
  const isLive = launch.status === "launched";

  return (
    <Link
      href={monitorHref}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{
        animationDelay: `${Math.min(idx, 12) * 60}ms`,
      }}
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
        {launch.mock && (
          <div className="absolute top-2 left-2">
            <Badge tone="mock" className="!h-[18px] !text-[9px] !px-2">
              Mock
            </Badge>
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
          {launch.mintPubkey
            ? `${launch.mintPubkey.slice(0, 5)}…${launch.mintPubkey.slice(-5)}`
            : "—"}
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <Badge
            tone={
              isLive
                ? "live"
                : launch.status === "pending-signature"
                ? "mock"
                : launch.status === "failed"
                ? "danger"
                : "neutral"
            }
            className="!h-[18px] !text-[9px] !px-2"
          >
            {launch.status.replaceAll("-", " ")}
          </Badge>
          <span className="text-[10px] text-ink-1000/55 font-bold">
            {new Date(launch.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-3 pt-1">
          {launch.pumpUrl && (
            <a
              href={launch.pumpUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-1000/72 hover:text-ink-1000 hover:underline"
            >
              Pump <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {launch.txSignature && !launch.mock && (
            <a
              href={`https://solscan.io/tx/${launch.txSignature}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-1000/72 hover:text-ink-1000 hover:underline"
            >
              Tx <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
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
