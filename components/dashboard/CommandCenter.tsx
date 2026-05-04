"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Users2,
  LineChart,
  Rocket,
  ArrowUpRight,
  Eye,
  Twitter,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { readLaunches, type SavedLaunch } from "@/lib/storage/launches";
import MemeRadarSection from "@/components/meme-radar/MemeRadarSection";

// Four-section command center matching the X CLAW agent loop:
//   Attention → Community → Intelligence → Execution
//
// Each section surfaces (1) what the agent does for that phase and
// (2) where to act on it right now.

export default function CommandCenter() {
  const [launches, setLaunches] = useState<SavedLaunch[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLaunches(readLaunches());
    setHydrated(true);
  }, []);

  const liveLaunches = launches.filter((l) => !l.mock && l.status === "launched");
  const lastLaunch = liveLaunches[0];

  return (
    <div className="space-y-6">
      {/* Real-time Meme Radar — the new first surface of X CLAW.
          Detect trending memes on X before they peak, then push them
          straight into the existing Pump Launch Agent. */}
      <section className="mx-auto max-w-7xl px-6">
        <MemeRadarSection />
      </section>

      {/* Top stats — quick agent state at a glance */}
      <section className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Engines online" value="4 / 4" tone="good" />
        <Stat
          label="Real launches"
          value={hydrated ? String(liveLaunches.length) : "…"}
        />
        <Stat
          label="Last launch"
          value={
            hydrated && lastLaunch
              ? `${lastLaunch.ticker} · ${shortAddr(lastLaunch.mintPubkey || "")}`
              : "—"
          }
        />
        <Stat label="Provider" value="Grok-first" tone="good" />
      </section>

      {/* 1. Attention */}
      <Section
        index="01"
        name="Attention Signals"
        tag="X-native ideas, hooks, viral angles"
        icon={Sparkles}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            title="Generate a meme launch idea"
            body="Type a vibe or theme — the agent drafts concept, ticker, mascot direction, and hooks."
            href="/launch"
            cta="Open launch wizard"
          />
          <Tile
            title="Draft 10 X launch posts"
            body="Built into every launch kit. Reuse the prompt for any topic — 5–10 posts, optional thread."
            href="/launch"
            cta="Start a kit"
            icon={Twitter}
          />
        </div>
      </Section>

      {/* 2. Community */}
      <Section
        index="02"
        name="Community Momentum"
        tag="Raid replies, TG, DMs, campaign plan"
        icon={Users2}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            title="20 raid replies + 5 influencer DMs"
            body="Auto-included with every launch kit. Compliance-aware prompts — no guaranteed-anything language."
            href="/launch"
            cta="Open launch wizard"
            icon={Users2}
          />
          <Tile
            title="Telegram announcement + 7-day plan"
            body="Ready-to-paste TG copy and a daily checklist. Drafts only — your team confirms before posting."
            href="/launch"
            cta="Draft community"
            icon={Send}
          />
        </div>
      </Section>

      {/* 3. On-chain Intelligence */}
      <Section
        index="03"
        name="On-chain Intelligence"
        tag="Wallets, holders, liquidity, volume"
        icon={LineChart}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveLaunches.length === 0 ? (
            <Tile
              title="Track any Solana wallet"
              body="Pull SOL balance, top token positions, and recent activity. Grok turns it into an X-ready brief."
              href="/launch"
              cta="Launch first to see your token"
              icon={Eye}
            />
          ) : (
            liveLaunches.slice(0, 3).map((l) => (
              <Tile
                key={l.id}
                title={`${l.tokenName} (${l.ticker})`}
                body={`Mint ${shortAddr(l.mintPubkey || "")}. Open the monitor to see holders, supply, and ready-to-post content.`}
                href={l.mintPubkey ? `/launches/${l.mintPubkey}` : "/launches"}
                cta="Open monitor"
                icon={LineChart}
              />
            ))
          )}
        </div>
      </Section>

      {/* 4. Launch Execution */}
      <Section
        index="04"
        name="Launch Execution"
        tag="Direct Pump.fun launch + monitoring"
        icon={Rocket}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            title="New memecoin launch"
            body="Concept → kit → review → wallet → sign → live. One signature. Real Solana mainnet."
            href="/launch"
            cta="Launch a memecoin"
            highlight
            icon={Rocket}
          />
          <Tile
            title="My launches"
            body={
              hydrated
                ? `${launches.length} record${launches.length === 1 ? "" : "s"} stored locally.`
                : "Loading..."
            }
            href="/launches"
            cta="Open history"
          />
        </div>
      </Section>
    </div>
  );
}

/* ─────────── helpers ─────────── */

function Section({
  index,
  name,
  tag,
  icon: Icon,
  children,
}: {
  index: string;
  name: string;
  tag: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-md bg-claw-500/10 border border-claw-500/30 flex items-center justify-center text-claw-400">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">
          Phase {index}
        </div>
        <div className="text-base font-semibold text-zinc-100">{name}</div>
        <div className="text-xs text-zinc-500">— {tag}</div>
      </div>
      {children}
    </section>
  );
}

function Tile({
  title,
  body,
  href,
  cta,
  icon: Icon,
  highlight = false,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon?: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card card-hover p-5 flex flex-col ${
        highlight ? "border-claw-500/40 shadow-neon" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <div className="h-9 w-9 rounded-md bg-glow-cyan/10 border border-glow-cyan/30 flex items-center justify-center text-glow-cyan">
            <Icon className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-9 w-9" />
        )}
        {highlight && <Badge tone="live">Primary</Badge>}
      </div>
      <div className="mt-3 text-base font-semibold text-zinc-100">{title}</div>
      <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs text-claw-400">
        {cta} <ArrowUpRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good";
}) {
  const ring = tone === "good" ? "ring-claw-500/20" : "ring-white/5";
  return (
    <div className={`card p-5 ring-1 ${ring}`}>
      <div className="text-[11px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function shortAddr(addr: string): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
}
