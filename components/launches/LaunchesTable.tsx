"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

// Public 'All Launches' gallery — shows every memecoin every KOKi agent
// has shipped, across all wallets. Hits /api/launches with no `wallet`
// param; the API returns the global list (filtered to status='launched',
// mock=false) so this is a real social-proof / discovery surface, not a
// duplicate of the user's My Launches dashboard.

interface PublicLaunch {
  mint_pubkey: string;
  ticker: string;
  token_name: string;
  chain: string;
  status: string;
  pump_url: string | null;
  metadata_uri: string | null;
  wallet_pubkey: string;
  created_at: string;
}

export default function LaunchesTable() {
  const [items, setItems] = useState<PublicLaunch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/launches", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { ok: boolean; launches?: PublicLaunch[]; error?: string }) => {
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error || "Failed to load launches");
          setItems([]);
          return;
        }
        setItems(json.launches ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Network error");
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return <SkeletonGrid />;
  }

  if (items.length === 0) {
    return (
      <div className="card !p-10 text-center">
        <div className="text-[20px] font-black tracking-tight">
          No public launches yet
        </div>
        <p className="text-[13px] text-ink-1000/70 mt-2 max-w-md mx-auto font-medium">
          {error
            ? "Couldn't load the public launch board right now. Try refreshing."
            : "Be the first to ship a memecoin through KOKi. Every shipped token shows up here for everyone to see."}
        </p>
        <Link
          href="/launch"
          className="btn btn-primary !py-2.5 !px-4 !text-sm mt-6 inline-flex"
        >
          Launch a memecoin
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((l, i) => (
        <PublicLaunchCard key={l.mint_pubkey} launch={l} idx={i} />
      ))}
    </div>
  );
}

function PublicLaunchCard({
  launch,
  idx,
}: {
  launch: PublicLaunch;
  idx: number;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!launch.metadata_uri) return;
    const cacheKey = `koki:img:${launch.mint_pubkey}`;
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
    fetch(launch.metadata_uri, { cache: "force-cache" })
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
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [launch.metadata_uri, launch.mint_pubkey]);

  const monitorHref = `/launches/${launch.mint_pubkey}`;
  const creator = `${launch.wallet_pubkey.slice(0, 4)}…${launch.wallet_pubkey.slice(-4)}`;

  return (
    <Link
      href={monitorHref}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 12) * 60}ms` }}
    >
      <div className="aspect-square w-full bg-koki-500 overflow-hidden relative border-b-[1.5px] border-ink-1000">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={launch.token_name}
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

      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="text-[14px] font-black tracking-tight truncate">
            {launch.token_name}
          </div>
          <span className="text-[10px] font-extrabold text-ink-1000/65 shrink-0">
            ${launch.ticker}
          </span>
        </div>
        <div className="text-[10px] text-ink-1000/55 font-mono truncate">
          {launch.mint_pubkey.slice(0, 5)}…{launch.mint_pubkey.slice(-5)}
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <Badge tone="live" className="!h-[18px] !text-[9px] !px-2">
            Launched
          </Badge>
          <span className="text-[10px] text-ink-1000/55 font-bold">
            {new Date(launch.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span
            className="text-[10px] text-ink-1000/55 font-mono"
            title={`Launched by wallet ${launch.wallet_pubkey}`}
          >
            by {creator}
          </span>
          {launch.pump_url && (
            <a
              href={launch.pump_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-ink-1000/72 hover:text-ink-1000 hover:underline"
            >
              Pump <ExternalLink className="h-2.5 w-2.5" />
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
