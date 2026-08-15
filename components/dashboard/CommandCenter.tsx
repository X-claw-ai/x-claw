"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Rocket, ArrowUpRight } from "lucide-react";
import { readLaunches, type SavedLaunch } from "@/lib/storage/launches";

// "My Launches" — the connected wallet's own launch history. Reads
// server-side rows (pons_launches, wallet_address filter) when connected
// and merges with any local-only records saved during the wizard so the
// dashboard populates the moment the tx confirms even before Supabase
// picks it up.

export default function CommandCenter() {
  const { address, isConnected } = useAccount();
  const [server, setServer] = useState<SavedLaunch[] | null>(null);
  const [local, setLocal] = useState<SavedLaunch[]>([]);

  useEffect(() => {
    setLocal(readLaunches());
  }, []);

  useEffect(() => {
    if (!address) {
      setServer([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/launches?wallet=${encodeURIComponent(address)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (json: {
          ok?: boolean;
          launches?: Array<{
            token_address: string;
            pool_address: string | null;
            ticker: string;
            token_name: string;
            logo_url: string | null;
            pons_url: string | null;
            explorer_url: string | null;
            created_at: string;
          }>;
        } | null) => {
          if (cancelled || !json?.ok) return;
          setServer(
            (json.launches ?? []).map((l) => ({
              id: l.token_address,
              createdAt: new Date(l.created_at).getTime(),
              tokenName: l.token_name,
              ticker: l.ticker,
              token: l.token_address,
              pool: l.pool_address ?? undefined,
              logo: l.logo_url ?? undefined,
              ponsUrl: l.pons_url ?? undefined,
              explorerUrl: l.explorer_url ?? undefined,
              status: "launched",
            })),
          );
        },
      )
      .catch(() => setServer([]));
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Merge server + local, dedup by token address, newest first.
  const merged = (() => {
    const seen = new Set<string>();
    const all = [...(server ?? []), ...local];
    const out: SavedLaunch[] = [];
    for (const l of all) {
      const key = (l.token ?? l.id).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(l);
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  })();

  return (
    <div className="space-y-10 pb-16">
      <section className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <span className="eyebrow !text-[10px] opacity-65">
              AGENT-LAUNCHED TOKENS
            </span>
            <h2 className="text-[26px] md:text-[30px] font-black tracking-tight mt-1">
              Tokens shipped by your HAMR agent
            </h2>
            <p className="text-[13px] text-ink-300/70 mt-1 font-medium max-w-xl">
              Every memecoin launched through the HAMR agent from{" "}
              {isConnected && address
                ? `${address.slice(0, 6)}…${address.slice(-4)}`
                : "your wallet"}
              , on Pons on Robinhood Chain.
            </p>
          </div>
          <Link href="/launch" className="btn btn-primary !py-2.5 !px-4 !text-sm">
            <Rocket className="h-4 w-4" />
            New launch
          </Link>
        </div>

        {!isConnected ? (
          <EmptyPrompt
            title="Connect a wallet"
            body="Your dashboard is scoped to the connected wallet — plug MetaMask, Rainbow, or Robinhood Wallet in from the header and your launches show up here."
          />
        ) : merged.length === 0 ? (
          <EmptyPrompt
            title="No launches yet"
            body="Run Auto-pilot or bring your own concept. Every token you ship lands here with a live monitor and Blockscout link."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {merged.map((l, i) => (
              <TokenCard key={l.id} launch={l} idx={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TokenCard({ launch, idx }: { launch: SavedLaunch; idx: number }) {
  const monitorHref = launch.token
    ? `/launches/${launch.token}`
    : "/launches";
  return (
    <Link
      href={monitorHref}
      className="card card-hover group flex flex-col overflow-hidden !p-0 launch-card-anim"
      style={{ animationDelay: `${Math.min(idx, 12) * 60}ms` }}
    >
      <div className="aspect-square w-full bg-koki-500 overflow-hidden relative border-b border-[var(--border-strong)]">
        {launch.logo ? (
          <Image
            src={launch.logo}
            alt={launch.tokenName}
            fill
            sizes="200px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-ink-300 font-black text-[clamp(20px,4vw,40px)] tracking-tight">
              ${launch.ticker}
            </span>
          </div>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="text-[14px] font-black tracking-tight truncate">
            {launch.tokenName}
          </div>
          <span className="text-[10px] font-extrabold text-ink-300/65 shrink-0">
            ${launch.ticker}
          </span>
        </div>
        <div className="text-[10px] text-ink-300/55 font-mono truncate">
          {launch.token
            ? `${launch.token.slice(0, 6)}…${launch.token.slice(-4)}`
            : "-"}
        </div>
        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <span className="text-[10px] text-ink-300/55 font-bold">
            {new Date(launch.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          {launch.ponsUrl && (
            <a
              href={launch.ponsUrl}
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

function EmptyPrompt({ title, body }: { title: string; body: string }) {
  return (
    <div className="card !p-10 text-center">
      <div className="text-[20px] font-black tracking-tight">{title}</div>
      <p className="text-[13px] text-ink-300/70 mt-2 max-w-md mx-auto font-medium">
        {body}
      </p>
      <Link
        href="/launch"
        className="btn btn-primary !py-2.5 !px-4 !text-sm mt-6 inline-flex"
      >
        <Rocket className="h-4 w-4" />
        Launch your first
      </Link>
    </div>
  );
}
