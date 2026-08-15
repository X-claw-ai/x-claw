"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import {
  ExternalLink,
  Rocket,
  Sparkles,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import type { Address } from "viem";
import { usePonsToken } from "@/lib/pons/hooks";
import { PONS_LAUNCH_PARAMS } from "@/lib/pons";
import { explorerUrl } from "@/lib/robinhood/chain";
import { Badge } from "@/components/ui/Badge";

// Live monitor for a Pons launch. Polls token meta + graduation + pool
// price every 20s. Handles the "not a Pons token" case gracefully by
// falling through to a Blockscout jump so bookmarks still lead somewhere
// useful.
//
// The route param comes in as `token` (was `mint` on the Solana era).
// Non-EVM strings show a friendly "invalid address" state instead of
// exploding.

interface Props {
  token: string;
}

export default function LaunchMonitorPage({ token }: Props) {
  const isEvmAddr = /^0x[0-9a-fA-F]{40}$/.test(token);
  const tokenAddr = isEvmAddr ? (token as Address) : undefined;
  const snap = usePonsToken(tokenAddr);

  const tokenExplorer = useMemo(
    () => (isEvmAddr ? explorerUrl("token", token) : null),
    [isEvmAddr, token],
  );
  const poolExplorer = useMemo(
    () => (snap.meta?.pool ? explorerUrl("address", snap.meta.pool) : null),
    [snap.meta?.pool],
  );

  if (!isEvmAddr) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="card !p-8">
          <div className="eyebrow">Not a Robinhood Chain address</div>
          <p className="mt-3 text-[13px] font-medium text-ink-300/80 leading-relaxed">
            The route <code className="font-mono">{token}</code> isn&apos;t an
            EVM address, so there&apos;s nothing to poll on Pons. If you
            arrived from a bookmark from the Solana era, that token lived
            on Pump.fun and isn&apos;t reachable from this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/launches" className="btn btn-primary !py-2.5 !px-4">
              All launches
            </Link>
            <Link href="/launch" className="btn btn-secondary !py-2.5 !px-4">
              Launch a new one
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (snap.loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="card !p-10 flex flex-col items-center gap-3 text-ink-300/70">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[13px] font-semibold">
            Reading Pons state on Robinhood Chain…
          </p>
        </div>
      </section>
    );
  }

  const hasMeta = Boolean(snap.meta);

  return (
    <section className="mx-auto max-w-4xl px-6 py-12 space-y-6">
      {/* Header */}
      <div className="card !p-6 flex items-center gap-5 flex-wrap">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-koki-500 border border-[var(--border-strong)] overflow-hidden relative">
          {snap.meta?.logo ? (
            <Image
              src={snap.meta.logo}
              alt={snap.meta.name}
              fill
              sizes="64px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-black text-ink-1000 text-lg">
              {snap.meta?.symbol?.slice(0, 3) ?? "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-display text-[26px] leading-tight truncate">
            {snap.meta?.name ?? "Unknown token"}
          </div>
          <div className="text-[12px] font-extrabold text-ink-300/70">
            ${snap.meta?.symbol ?? "-"} · Pons · Robinhood Chain
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={snap.graduation?.graduated ? "live" : "neutral"}>
            {snap.graduation?.graduated ? "Graduated" : "Bonding"}
          </Badge>
        </div>
      </div>

      {snap.error && (
        <div className="card !p-4 !border-red-500/50 !bg-red-500/10 text-[12px] text-red-300 font-semibold break-words">
          {snap.error}
        </div>
      )}

      {/* Graduation progress */}
      {snap.graduation && (
        <div className="card !p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="eyebrow !text-[10px]">Graduation</div>
              <div className="mt-1 text-[15px] font-black tracking-tight">
                {snap.graduation.progressPercent}% of{" "}
                {PONS_LAUNCH_PARAMS.graduationThresholdEth} ETH
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-ink-300/60 uppercase tracking-wider">
                Paired
              </div>
              <div className="text-[13px] font-extrabold tabular-nums">
                {Number(snap.graduation.pairedPrincipalEth).toFixed(4)} ETH
              </div>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-ink-1000/40 overflow-hidden">
            <div
              className="h-full bg-koki-500 transition-all duration-500"
              style={{ width: `${snap.graduation.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Price + fundamentals grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Price (WETH)"
          value={
            snap.priceWeth !== null
              ? snap.priceWeth.toLocaleString(undefined, {
                  maximumSignificantDigits: 4,
                })
              : "-"
          }
          hint="Live pool price"
        />
        <StatCard
          label="Fixed supply"
          value={PONS_LAUNCH_PARAMS.supplyHumanReadable.toLocaleString()}
          hint="1B tokens · 18 decimals"
        />
        <StatCard
          label="Pool fee"
          value="1%"
          hint="Uniswap V3 fee tier"
        />
        <StatCard
          label="Restrictions end"
          value={snap.launch ? `#${snap.launch.restrictionsEndBlock}` : "-"}
          hint="Wallet-cap window (first 2 blocks)"
        />
      </div>

      {/* Contract references */}
      <div className="card !p-5 space-y-3">
        <div className="eyebrow !text-[10px]">Contracts</div>
        <RefRow
          label="Token"
          value={token}
          href={tokenExplorer ?? undefined}
        />
        {snap.meta?.pool && (
          <RefRow
            label="Pool"
            value={snap.meta.pool}
            href={poolExplorer ?? undefined}
          />
        )}
        {snap.launch?.deployer && (
          <RefRow
            label="Deployer"
            value={snap.launch.deployer}
            href={
              snap.launch.deployer
                ? explorerUrl("address", snap.launch.deployer)
                : undefined
            }
          />
        )}
      </div>

      {/* CTAs */}
      {hasMeta && (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`https://www.ponsfamily.com/launchpad/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary !py-3 !px-5"
          >
            <Rocket className="h-4 w-4" />
            Trade on Pons
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {snap.meta?.socials?.twitter && (
            <a
              href={
                snap.meta.socials.twitter.startsWith("http")
                  ? snap.meta.socials.twitter
                  : `https://x.com/${snap.meta.socials.twitter.replace(/^@/, "")}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary !py-3 !px-5"
            >
              <Sparkles className="h-4 w-4" />
              X account
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {tokenExplorer && (
            <a
              href={tokenExplorer}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary !py-3 !px-5"
            >
              Blockscout
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {!hasMeta && (
        <div className="card !p-6">
          <div className="eyebrow">No Pons state yet</div>
          <p className="mt-3 text-[13px] font-medium text-ink-300/80 leading-relaxed">
            KOKi couldn&apos;t find this address in the current or legacy
            Pons factory. It may not have launched yet, or it lives outside
            the Pons protocol. Check Blockscout directly:
          </p>
          {tokenExplorer && (
            <a
              href={tokenExplorer}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex btn btn-primary !py-2.5 !px-4"
            >
              Open on Blockscout
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card !p-4">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72">
        {label}
      </div>
      <div className="mt-1.5 text-[17px] font-black tabular-nums tracking-tight">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[10px] font-semibold text-ink-300/55">
          {hint}
        </div>
      )}
    </div>
  );
}

function RefRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72">
          {label}
        </div>
        <div className="font-mono text-[12px] text-ink-300 truncate mt-0.5">
          {value}
        </div>
      </div>
      {href && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-300/60" />
      )}
    </div>
  );
  if (!href) return inner;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md -mx-2 px-2 py-1 hover:bg-ink-1000/10 transition-colors"
    >
      {inner}
    </a>
  );
}
