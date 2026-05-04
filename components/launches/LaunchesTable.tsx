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
      <div className="card p-6 text-sm font-bold text-ink-1000/65">Loading launches…</div>
    );
  }

  const showingMockOnly = items === MOCK_LAUNCH_HISTORY;

  return (
    <>
      {showingMockOnly && (
        <div className="card p-3 text-xs font-bold text-ink-1000 mb-4">
          아직 실제 런치 없음 — 샘플 행 표시 중. Pump Launch Agent 실행 후 여기에 실제 런치가 보입니다.
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 eyebrow !text-[10px] border-b-[1.5px] border-ink-1000 bg-cream-100">
          <div className="col-span-4">Token</div>
          <div className="col-span-2">Chain</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Created</div>
          <div className="col-span-1 text-right">Links</div>
        </div>
        {items.map((l) => (
          <div
            key={l.id}
            className="grid grid-cols-12 items-center px-5 py-4 border-b-[1.5px] border-ink-1000/15 last:border-b-0 text-sm"
          >
            <div className="col-span-4">
              <div className="font-black text-[15px] text-ink-1000 tracking-tight">
                {l.tokenName}
              </div>
              <div className="text-xs font-extrabold text-ink-1000/65">{l.ticker}</div>
              {l.mintPubkey && (
                <div className="text-[10px] font-mono text-ink-1000/55 mt-0.5">
                  {l.mintPubkey.slice(0, 6)}…{l.mintPubkey.slice(-6)}
                </div>
              )}
            </div>
            <div className="col-span-2 text-ink-1000 font-bold capitalize">{l.chain}</div>
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
            <div className="col-span-3 text-xs text-ink-1000/72 font-bold">
              {new Date(l.createdAt).toLocaleString()}
            </div>
            <div className="col-span-1 text-right space-x-2">
              {l.pumpUrl && (
                <Link
                  href={l.pumpUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-ink-1000 font-extrabold hover:underline"
                >
                  Pump
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {l.txSignature && !l.mock && (
                <Link
                  href={`https://solscan.io/tx/${l.txSignature}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-ink-1000/72 font-bold hover:text-ink-1000"
                >
                  Tx
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {!l.pumpUrl && !l.txSignature && (
                <span className="text-xs text-ink-1000/55">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
