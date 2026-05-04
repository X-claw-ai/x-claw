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

// Four-section command center mirroring the KOKi agent loop.
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
    <div className="space-y-12">
      {/* Real-time Meme Radar */}
      <section className="mx-auto max-w-6xl px-6">
        <MemeRadarSection />
      </section>

      {/* Top stats */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/5">
          <Stat label="Engines" value="4" sub="Online" tone="good" />
          <Stat
            label="Real launches"
            value={hydrated ? String(liveLaunches.length) : "—"}
            sub={lastLaunch ? `Last: ${lastLaunch.ticker}` : "None yet"}
          />
          <Stat
            label="Provider"
            value="Grok"
            sub="xAI · primary"
          />
          <Stat label="Network" value="Solana" sub="Mainnet" tone="info" />
        </div>
      </section>

      {/* Phase sections */}
      <Section index="01" name="Attention" tag="X-native ideas, hooks, viral angles" icon={Sparkles}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            title="Generate a meme launch idea"
            body="Type a vibe, theme, or community. The agent drafts concept, ticker, mascot direction, and hooks."
            href="/launch"
            cta="Open launch wizard"
          />
          <Tile
            title="Draft 10 X launch posts"
            body="Built into every launch kit. Compliance-aware prompts — no guaranteed-anything language."
            href="/launch"
            cta="Start a kit"
            icon={Twitter}
          />
        </div>
      </Section>

      <Section index="02" name="Community" tag="Raid replies, TG, DMs, campaign plan" icon={Users2}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            title="20 raid replies + 5 influencer DMs"
            body="Auto-included with every launch kit. Drafts only — your team confirms before posting."
            href="/launch"
            cta="Open launch wizard"
          />
          <Tile
            title="Telegram announcement + 7-day plan"
            body="Ready-to-paste TG copy and a daily checklist."
            href="/launch"
            cta="Draft community"
            icon={Send}
          />
        </div>
      </Section>

      <Section
        index="03"
        name="Intelligence"
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

      <Section
        index="04"
        name="Execution"
        tag="Direct Pump.fun launch + monitoring"
        icon={Rocket}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Tile
            title="New memecoin launch"
            body="Concept → kit → review → wallet → sign → live. One signature. Solana mainnet."
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
    <section className="mx-auto max-w-6xl px-6">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-[11px] font-mono text-zinc-600 tracking-[0.18em]">
          PHASE {index}
        </span>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full border border-white/10 flex items-center justify-center text-koki-400">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xl font-semibold text-white tracking-tight">
            {name}
          </span>
        </div>
        <span className="text-sm text-zinc-500 hidden sm:inline">— {tag}</span>
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
      className={`card card-hover group flex flex-col ${
        highlight ? "card-emph" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <div className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-koki-400">
            <Icon className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-9 w-9" />
        )}
        {highlight && <Badge tone="live">Primary</Badge>}
      </div>
      <div className="mt-4 text-base font-semibold text-white tracking-tight">
        {title}
      </div>
      <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{body}</p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm text-koki-400 font-medium group-hover:gap-2 transition-all">
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "info";
}) {
  const accent =
    tone === "good"
      ? "text-koki-400"
      : tone === "info"
      ? "text-sea-400"
      : "text-white";
  return (
    <div className="bg-ink-950 p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className={`mt-2.5 text-2xl md:text-3xl font-semibold tabular-nums tracking-extra-tight ${accent}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function shortAddr(addr: string): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
}
