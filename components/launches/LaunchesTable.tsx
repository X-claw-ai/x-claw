"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ExternalLink } from "lucide-react";
import { readLaunches, type SavedLaunch } from "@/lib/storage/launches";
import { MOCK_LAUNCH_HISTORY } from "@/lib/mock";

export default function LaunchesTable() {
  const [items, setItems] = useState<SavedLaunch[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const real = readLaunches();
    // Show real launches first; only fall back to demo rows if there are no
    // real launches yet (so brand new users still see something).
    setItems(real.length > 0 ? real : (MOCK_LAUNCH_HISTORY as SavedLaunch[]));
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="card p-6 text-sm text-zinc-500">Loading launches…</div>
    );
  }

  const showingMockOnly = items === MOCK_LAUNCH_HISTORY;

  return (
    <>
      {showingMockOnly && (
        <div className="card p-3 text-xs text-amber-200 border-amber-300/30 mb-4">
          No real launches yet — showing sample rows. Run the Pump Launch
          Agent to see your actual launches here.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-widest text-zinc-500 border-b border-white/5">
          <div className="col-span-4">Token</div>
          <div className="col-span-2">Chain</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Created</div>
          <div className="col-span-1 text-right">Links</div>
        </div>
        {items.map((l) => (
          <div
            key={l.id}
            className="grid grid-cols-12 items-center px-5 py-4 border-b border-white/5 last:border-b-0 text-sm"
          >
            <div className="col-span-4">
              <div className="font-medium text-zinc-100">{l.tokenName}</div>
              <div className="text-xs text-zinc-500">{l.ticker}</div>
              {l.mintPubkey && (
                <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                  {l.mintPubkey.slice(0, 6)}…{l.mintPubkey.slice(-6)}
                </div>
              )}
            </div>
            <div className="col-span-2 text-zinc-300 capitalize">{l.chain}</div>
            <div className="col-span-2 flex flex-col gap-1">
              <Badge
                tone={
                  l.status === "launched"
                    ? "live"
                    : l.status === "pending-signature"
                    ? "mock"
                    : l.status === "failed"
                    ? "danger"
                    : "neutral"
                }
              >
                {l.status.replaceAll("-", " ")}
              </Badge>
              {l.mock && <Badge tone="mock">Mock</Badge>}
            </div>
            <div className="col-span-3 text-xs text-zinc-400">
              {new Date(l.createdAt).toLocaleString()}
            </div>
            <div className="col-span-1 text-right space-x-2">
              {l.pumpUrl && (
                <Link
                  href={l.pumpUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-claw-400 hover:text-claw-500"
                >
                  Pump
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {l.txSignature && !l.mock && (
                <Link
                  href={`https://solscan.io/tx/${l.txSignature}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Tx
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {!l.pumpUrl && !l.txSignature && (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
