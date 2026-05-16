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

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        <h1 className="text-display text-display-lg mt-7 max-w-5xl text-balance anim-up">
          Detect. Analyze.
          <br />
          <span className="stamp">Launch.</span> Repeat.
        </h1>

        {/* Positioning statement, the one-liner that explains what KOKi
            actually does. Bigger and brighter than a subline because this
            is the elevator pitch every visitor should read. */}
        <p className="mt-9 text-ink-300 text-xl md:text-2xl leading-snug max-w-3xl font-bold text-balance">
          An autonomous AI agent that detects viral memes on{" "}
          <span className="text-koki-500">@X</span> and,{" "}
          <span className="text-koki-500">with one click</span>, creates
          everything from token concepts and launch kits to{" "}
          <span className="text-koki-500">Pump.fun launch</span>.
        </p>

        <p className="mt-5 text-ink-400 text-base md:text-lg leading-snug max-w-2xl font-medium text-balance">
          Grok picks the next meme on X, drafts the launch kit, and ships it to
          Pump.fun. You sign once. Done.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/launch" className="btn btn-primary !py-3 !px-5">
            Launch your meme
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary !py-3 !px-5">
            See agent launches
          </Link>
        </div>

        <div className="mt-7 inline-flex items-center gap-2 text-[12px] font-bold text-ink-300/72">
          <ShieldCheck className="h-3.5 w-3.5" />
          Solana mainnet, Phantom / Solflare, KOKi never holds your keys.
        </div>

        <div className="hairline mt-16 max-w-4xl" />

        <div className="mt-10 max-w-5xl">
          <div className="eyebrow !text-[10px] mb-5">The agent loop</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { k: "Detect", d: "Live meme radar across X" },
              { k: "Analyze", d: "Ten signal readiness scoring" },
              { k: "Generate", d: "Full launch kit, 30+ assets" },
              { k: "Launch", d: "Direct Pump.fun execution" },
              { k: "Monitor", d: "Onchain + X engagement" },
            ].map((s, i) => (
              <div key={s.k} className="card !p-4">
                <div className="eyebrow !text-[9px] opacity-70">Phase 0{i + 1}</div>
                <div className="mt-1 text-[18px] font-black tracking-tight text-ink-300">
                  {s.k}
                </div>
                <div className="mt-1 text-[12px] text-ink-300/70 leading-snug font-medium">
                  {s.d}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
