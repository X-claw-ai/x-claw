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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Engines" value="4" sub="Online" tone="good" />
          <Stat
            label="Real launches"
            value={hydrated ? String(liveLaunches.length) : "—"}
            sub={lastLaunch ? `Last: ${lastLaunch.ticker}` : "None yet"}
          />
          <Stat label="Provider" value="Grok" sub="xAI · primary" />
          <Stat label="Network" value="Solana" sub="Mainnet" />
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
      <div className="flex items-baseline gap-4 mb-6 flex-wrap">
        <span className="eyebrow !text-[10px] opacity-65">PHASE {index}</span>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full border-[1.5px] border-ink-1000 bg-cream-50 flex items-center justify-center text-ink-1000">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[22px] font-black text-ink-1000 tracking-tight">
            {name}
          </span>
        </div>
        <span className="text-[13px] text-ink-1000/72 hidden sm:inline font-bold">— {tag}</span>
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
      className={`card card-hover group flex flex-col !p-6 ${
        highlight ? "card-emph" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <div
            className={`h-10 w-10 rounded-full border-[1.5px] flex items-center justify-center ${
              highlight
                ? "border-koki-500 text-koki-500 bg-ink-1000"
                : "border-ink-1000 text-ink-1000 bg-koki-500"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-10 w-10" />
        )}
        {highlight && <Badge tone="live">Primary</Badge>}
      </div>
      <div
        className={`mt-4 text-[18px] font-black tracking-tight ${
          highlight ? "text-koki-500" : "text-ink-1000"
        }`}
      >
        {title}
      </div>
      <p
        className={`mt-1.5 text-[13px] leading-snug font-medium ${
          highlight ? "text-koki-500/85" : "text-ink-1000/72"
        }`}
      >
        {body}
      </p>
      <div
        className={`mt-5 inline-flex items-center gap-1.5 text-[13px] font-extrabold group-hover:gap-2 transition-all ${
          highlight ? "text-koki-500" : "text-ink-1000"
        }`}
      >
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
  const isEmph = tone === "good";
  return (
    <div className={`card !p-5 md:!p-6 ${isEmph ? "card-emph" : ""}`}>
      <div className={`eyebrow !text-[10px] ${isEmph ? "text-koki-500" : "text-ink-1000/70"}`}>
        {label}
      </div>
      <div
        className={`mt-2.5 text-[28px] md:text-[32px] font-black tabular-nums tracking-tight ${
          isEmph ? "text-koki-500" : "text-ink-1000"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`mt-1 text-[12px] font-bold ${
            isEmph ? "text-koki-500/80" : "text-ink-1000/65"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function shortAddr(addr: string): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
}
