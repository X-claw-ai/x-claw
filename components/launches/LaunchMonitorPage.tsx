"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  Rocket,
  Users2,
  Sparkles,
  LineChart,
  Twitter,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import TokenInfoBlock from "@/components/launches/TokenInfoBlock";
import WalletTrackingAgent from "@/components/wallet-tracking/WalletTrackingAgent";
import XPostGeneratorAgent from "@/components/x-post-generator/XPostGeneratorAgent";
import { readLaunches, type SavedLaunch } from "@/lib/storage/launches";

// Per-token monitor page. Mirrors the agent loop:
//   01 Attention   — generate post-launch X content for THIS token
//   02 Community   — point to launch wizard if you need a fresh kit
//   03 Intelligence — token supply + top holders + creator wallet activity
//   04 Execution   — links to Pump.fun, Solscan, the original launch tx

export default function LaunchMonitorPage({ mint }: { mint: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [record, setRecord] = useState<SavedLaunch | null>(null);

  useEffect(() => {
    const all = readLaunches();
    const r = all.find((x) => x.mintPubkey === mint || x.id === mint) ?? null;
    setRecord(r);
    setHydrated(true);
  }, [mint]);

  const tokenName = record?.tokenName || "Unknown token";
  const ticker = record?.ticker || "—";
  const isMock = record?.mock ?? false;

  const pumpUrl = record?.pumpUrl || `https://pump.fun/coin/${mint}`;
  const solscanToken = `https://solscan.io/token/${mint}`;
  const solscanTx = record?.txSignature
    ? `https://solscan.io/tx/${record.txSignature}`
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Rocket className="h-5 w-5 text-claw-500" />
              <h1 className="text-xl font-semibold">{tokenName}</h1>
              <span className="text-sm text-zinc-400">· {ticker}</span>
              {isMock && <Badge tone="mock">Mock</Badge>}
              {!isMock && record && <Badge tone="live">Live launch</Badge>}
              {!record && hydrated && (
                <Badge tone="neutral">External token</Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-zinc-500 font-mono">
              Mint: {mint}
            </div>
            {record?.createdAt && (
              <div className="mt-1 text-xs text-zinc-500">
                Launched {new Date(record.createdAt).toLocaleString()}
                {record?.devBuyInSol != null
                  ? ` · dev buy ${record.devBuyInSol} SOL`
                  : ""}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={pumpUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-claw-500 text-ink-950 px-3 py-1.5 text-xs font-semibold hover:bg-claw-400"
            >
              Pump.fun <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={solscanToken}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:border-claw-500/40"
            >
              Solscan token <ExternalLink className="h-3 w-3" />
            </a>
            {solscanTx && (
              <a
                href={solscanTx}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:border-claw-500/40"
              >
                Launch tx <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 03 — Intelligence (most useful immediately after launch) */}
      <PhaseHeader
        index="03"
        name="On-chain Intelligence"
        tag="Supply, holders, creator wallet activity"
        icon={LineChart}
      />
      <TokenInfoBlock mint={mint} />

      {record?.mintPubkey && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-claw-500" />
            <div className="text-sm font-semibold">
              Creator wallet activity
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Tracking the wallet that signed the launch transaction. Note: for
            tokens you didn't launch, paste any wallet address.
          </p>
          {/* The wallet that signed the launch is the creator wallet
              recorded by the wizard. We don't store it directly today, so
              show a free-form tracker; user can paste known addresses. */}
          <WalletTrackingAgent />
        </div>
      )}
      {!record && hydrated && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-claw-500" />
            <div className="text-sm font-semibold">Wallet tracker</div>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Paste any wallet address to track its on-chain activity.
          </p>
          <WalletTrackingAgent />
        </div>
      )}

      {/* 01 — Attention (post-launch promo) */}
      <PhaseHeader
        index="01"
        name="Attention"
        tag="Generate post-launch X content for this token"
        icon={Sparkles}
      />
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Twitter className="h-4 w-4 text-claw-500" />
          <span className="font-semibold">X Post Generator (post-launch)</span>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Pre-filled to write about this token. Generate updates, milestone
          posts, and reply hooks. Drafts only — you confirm before posting.
        </p>
        <XPostGeneratorAgent
          defaultTopic={
            record
              ? `${tokenName} (${ticker}) — post-launch update for X. Mint ${mint}.`
              : `Memecoin update for ${ticker}`
          }
          defaultAudience="X-native crypto and meme coin community"
        />
      </div>

      {/* 02 — Community */}
      <PhaseHeader
        index="02"
        name="Community"
        tag="Reuse the launch wizard for any new community materials"
        icon={Users2}
      />
      <div className="card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm font-semibold">
            Need fresh raid replies, TG announcements, or DMs?
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            The launch wizard's kit generator works on any concept — start a
            new flow if you need updated community materials.
          </p>
        </div>
        <Link
          href="/launch"
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:border-claw-500/40"
        >
          Open launch wizard
        </Link>
      </div>

      {/* 04 — Execution recap */}
      <PhaseHeader
        index="04"
        name="Execution recap"
        tag="Original launch transaction and metadata"
        icon={Rocket}
      />
      <div className="card p-5 grid sm:grid-cols-2 gap-3">
        <KV label="Mint" value={mint} />
        <KV label="Token" value={`${tokenName} (${ticker})`} />
        {record?.txSignature && <KV label="Tx signature" value={record.txSignature} />}
        {record?.metadataUri && <KV label="Metadata URI" value={record.metadataUri} />}
        {record?.devBuyInSol != null && (
          <KV label="Initial dev buy" value={`${record.devBuyInSol} SOL`} />
        )}
        {record?.createdAt && (
          <KV
            label="Launched at"
            value={new Date(record.createdAt).toLocaleString()}
          />
        )}
      </div>
    </div>
  );
}

function PhaseHeader({
  index,
  name,
  tag,
  icon: Icon,
}: {
  index: string;
  name: string;
  tag: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-white/5 pt-8">
      <div className="h-9 w-9 rounded-md bg-claw-500/10 border border-claw-500/30 flex items-center justify-center text-claw-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        Phase {index}
      </div>
      <div className="text-base font-semibold text-zinc-100">{name}</div>
      <div className="text-xs text-zinc-500">— {tag}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xs font-mono break-all text-zinc-200">
        {value}
      </div>
    </div>
  );
}
