import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-app">
      {/* Decorative giant paw watermark, orange glow on dark canvas */}
      <svg
        viewBox="0 0 32 32"
        className="absolute -right-20 -bottom-32 w-[640px] h-[640px] opacity-[0.06] pointer-events-none"
        aria-hidden
      >
        <ellipse cx="16" cy="22" rx="7.5" ry="6" fill="#E55B14" />
        <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill="#E55B14" />
        <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill="#E55B14" />
        <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill="#E55B14" />
        <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill="#E55B14" />
      </svg>

      {/* Compact hero: pitch + CTAs only, so the live token gallery
          appears as soon as the user scrolls a single screen. The
          5-phase 'agent loop' moved to EnginesSection which already
          explains the four engines in depth. */}
      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 md:pt-24 md:pb-16">
        <h1 className="text-display text-display-lg max-w-5xl text-balance anim-up">
          Detect. Analyze.
          <br />
          <span className="stamp">Launch.</span> Repeat.
        </h1>

        {/* Positioning statement, the one-liner that explains what HAMR
            actually does. Bigger and brighter than a subline because this
            is the elevator pitch every visitor should read. */}
        <p className="mt-7 text-ink-300 text-xl md:text-2xl leading-snug max-w-3xl font-bold text-balance">
          An autonomous AI agent that detects viral memes on{" "}
          <span className="text-koki-500">@X</span> and,{" "}
          <span className="text-koki-500">with one click</span>, creates
          everything from token concepts and launch kits to a{" "}
          <span className="text-koki-500">live launch on Robinhood Chain</span>.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/launch" className="btn btn-primary !py-3 !px-5">
            Launch your meme
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary !py-3 !px-5">
            See agent launches
          </Link>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-ink-300/72">
          <ShieldCheck className="h-3.5 w-3.5" />
          Robinhood Chain mainnet, MetaMask / Rainbow / Robinhood Wallet, HAMR never holds your keys.
        </div>
      </div>
    </section>
  );
}
