"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { parseAbiItem, type Address } from "viem";
import { getPublicClient } from "@/lib/robinhood/client";
import { HAMR_CURVE } from "@/lib/hamr";
import { HAMR_V2, DEAD_ADDRESS } from "@/lib/hamr/v2";
import { explorerUrl } from "@/lib/robinhood/chain";
import { ExternalLink } from "lucide-react";

// Holder table — rebuilt from the token's own ERC-20 Transfer events,
// no indexer. Every mint/buy/sell/transfer is a Transfer log, so
// summing them per address IS the balance sheet. Special addresses
// (bonding curve, locked LP) are labeled instead of hidden so the
// supply always adds up to 100%.

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

const ZERO = "0x0000000000000000000000000000000000000000";
const SUPPLY_WEI = BigInt(HAMR_CURVE.totalSupply) * 10n ** 18n;
const MAX_ROWS = 20;

interface Holder {
  address: string;
  pctBps: number; // 0–10000, basis points of total supply
  label?: "pool" | "locked-lp" | "creator" | "burned";
}

export default function HoldersTable({
  token,
  creator,
  pool,
}: {
  token: Address;
  creator?: string;
  /** The token's Uniswap V3 pool — labeled, never hidden. */
  pool?: string;
}) {
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const client = getPublicClient();
        const logs = await client.getLogs({
          address: token,
          event: transferEvent,
          fromBlock: 0n,
          toBlock: "latest",
        });
        if (cancelled) return;

        const balances = new Map<string, bigint>();
        for (const l of logs) {
          const { from, to, value } = l.args as {
            from?: string;
            to?: string;
            value?: bigint;
          };
          if (typeof value !== "bigint" || !from || !to) continue;
          const f = from.toLowerCase();
          const t = to.toLowerCase();
          if (f !== ZERO) balances.set(f, (balances.get(f) ?? 0n) - value);
          if (t !== ZERO) balances.set(t, (balances.get(t) ?? 0n) + value);
        }

        const poolLc = pool?.toLowerCase();
        const deadLc = DEAD_ADDRESS.toLowerCase();
        const locker = HAMR_V2.locker.toLowerCase();
        const creatorLc = creator?.toLowerCase();

        const rows: Holder[] = [...balances.entries()]
          .filter(([, bal]) => bal > 0n)
          .map(([addr, bal]) => ({
            address: addr,
            // bps with wei-exact math: bal * 10000 / supply
            pctBps: Number((bal * 10_000n) / SUPPLY_WEI),
            label:
              addr === deadLc
                ? ("burned" as const)
                : addr === poolLc
                ? ("pool" as const)
                : addr === locker
                  ? ("locked-lp" as const)
                  : addr === creatorLc
                    ? ("creator" as const)
                    : undefined,
          }))
          .sort((a, b) => b.pctBps - a.pctBps)
          .slice(0, MAX_ROWS);

        setHolders(rows);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, creator, pool]);

  return (
    <div className="card !p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-black tracking-tight">
          Holders{holders ? ` (${holders.length})` : ""}
        </h2>
        <span className="text-[10px] font-bold text-ink-300/45 uppercase tracking-wider">
          on-chain · live
        </span>
      </div>

      {failed ? (
        <div className="py-6 text-center text-[12px] font-semibold text-ink-300/50">
          Holder scan unavailable — RPC log query failed.
        </div>
      ) : holders === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-ink-1000/5 animate-pulse" />
          ))}
        </div>
      ) : holders.length === 0 ? (
        <div className="py-6 text-center text-[12px] font-semibold text-ink-300/50">
          No holders yet.
        </div>
      ) : (
        <div>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto] gap-3 px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-300/45 border-b border-[var(--border)]">
            <span>Holder</span>
            <span className="text-right">% supply</span>
          </div>
          <ul>
            {holders.map((h) => (
              <li
                key={h.address}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-2.5 border-b border-[var(--border)] last:border-b-0"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Image
                    src="/clip-avatar.png"
                    alt=""
                    width={26}
                    height={26}
                    className="rounded-full shrink-0 border border-[var(--border-strong)]"
                  />
                  <a
                    href={explorerUrl("address", h.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[12px] font-bold text-ink-300/85 hover:text-ink-300 hover:underline truncate inline-flex items-center gap-1"
                  >
                    {h.address.slice(0, 6)}…{h.address.slice(-4)}
                    <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                  </a>
                  {h.label === "burned" && (
                    <span className="shrink-0 rounded-full bg-orange-500/15 text-orange-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      🔥 Burned
                    </span>
                  )}
                  {h.label === "pool" && (
                    <span className="shrink-0 rounded-full bg-koki-500/15 text-koki-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      Uniswap pool
                    </span>
                  )}
                  {h.label === "locked-lp" && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      Locked LP
                    </span>
                  )}
                  {h.label === "creator" && (
                    <span className="shrink-0 rounded-full bg-ink-1000/10 text-ink-300/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      Creator
                    </span>
                  )}
                </span>
                <span className="text-right text-[12px] font-extrabold tabular-nums">
                  {(h.pctBps / 100).toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
