import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  Radar,
  ImageIcon,
  Rocket,
  LinkIcon,
  Percent,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Auto-pilot — HAMR.fun",
  description:
    "One click. The HAMR agent finds the most viral meme on X in real time, tokenizes it, and launches it on Robinhood Chain.",
};

// /autopilot — the product-strength page. What makes HAMR different:
// a single click turns the most viral meme on X, right now, into a
// live token on our own launchpad.

export default function AutopilotPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 md:px-6 py-12 md:py-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-koki-500/40 bg-koki-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-koki-300">
          <Sparkles className="h-3 w-3" />
          Auto-pilot
        </div>
        <h1 className="mt-4 text-display text-[clamp(30px,5vw,52px)]">
          One click. The internet&apos;s hottest meme becomes a coin.
        </h1>
        <p className="mt-4 text-[15px] text-ink-300/75 font-medium leading-relaxed">
          The HAMR agent scans X in real time, locks onto the single most
          viral meme of the moment, and turns it into a live token on
          Robinhood Chain — name, ticker, the meme&apos;s own image as the
          logo, and the source post attached. You press one button and
          sign once. That&apos;s the whole job.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            href="/launch?autopilot=1"
            className="btn btn-primary !py-3 !px-6"
          >
            <Sparkles className="h-4 w-4" />
            Run Auto-pilot
          </Link>
          <Link href="/docs" className="btn btn-secondary !py-3 !px-5">
            Read the docs
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Step
          icon={<Radar className="h-4 w-4" />}
          n="01"
          title="Scan X live"
          body="The agent sweeps X for what's exploding right now — 500K+ view posts from the last 24 hours, not stale meme lists."
        />
        <Step
          icon={<ImageIcon className="h-4 w-4" />}
          n="02"
          title="Tokenize the meme"
          body="Name, ticker, and description are drafted from the post itself. The meme's own image becomes the token logo — stored on-chain."
        />
        <Step
          icon={<LinkIcon className="h-4 w-4" />}
          n="03"
          title="Receipts attached"
          body="Every Auto-pilot token links back to the original X post, so anyone can verify exactly which viral moment it captures."
        />
        <Step
          icon={<Rocket className="h-4 w-4" />}
          n="04"
          title="You sign once"
          body="One wallet signature deploys the token and opens the bonding curve on the HAMR launchpad. No forms, no waiting."
        />
      </div>

      {/* Why it wins */}
      <div className="mt-14">
        <h2 className="text-[20px] font-black tracking-tight mb-4">
          Why Auto-pilot wins
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Edge
            icon={<Zap className="h-4 w-4" />}
            title="Speed is the edge"
            body="Memecoins are an attention race. By the time you've seen a meme, opened a launchpad, and filled a form, the moment is gone. Auto-pilot compresses that to one click."
          />
          <Edge
            icon={<Percent className="h-4 w-4" />}
            title="You keep 75% of fees"
            body="Every trade on your token's curve pays a 1% fee — and 75% of it goes to you, the creator, forever. Claim any time. Even after graduation, locked LP fees keep flowing."
          />
          <Edge
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Your wallet is the only signer"
            body="The agent prepares everything but touches nothing. No custody, no API keys over your funds — the launch only happens when your wallet signs it."
          />
        </div>
      </div>

      {/* CTA */}
      <div className="mt-14 card !p-8 text-center">
        <div className="text-[22px] font-black tracking-tight">
          The next viral moment is already trending.
        </div>
        <p className="mt-2 text-[13px] text-ink-300/70 font-medium">
          Let the agent catch it before anyone else does.
        </p>
        <Link
          href="/launch?autopilot=1"
          className="mt-5 inline-flex btn btn-primary !py-3 !px-6"
        >
          <Sparkles className="h-4 w-4" />
          Run Auto-pilot now
        </Link>
      </div>
    </section>
  );
}

function Step({
  icon,
  n,
  title,
  body,
}: {
  icon: React.ReactNode;
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card !p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-koki-500/15 text-koki-300">
          {icon}
        </span>
        <span className="text-[11px] font-black text-ink-300/35">{n}</span>
      </div>
      <div className="mt-3 text-[14px] font-black tracking-tight">{title}</div>
      <p className="mt-1.5 text-[12px] text-ink-300/70 font-medium leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function Edge({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card !p-5 !border-koki-500/25">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-koki-500 text-white">
        {icon}
      </span>
      <div className="mt-3 text-[14px] font-black tracking-tight">{title}</div>
      <p className="mt-1.5 text-[12px] text-ink-300/70 font-medium leading-relaxed">
        {body}
      </p>
    </div>
  );
}
