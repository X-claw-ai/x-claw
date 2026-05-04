import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-32">
        <div className="pill mb-7 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-claw-500" />
          $XCLAW · Grok-native meme coin agent
        </div>

        <h1 className="text-display text-5xl md:text-7xl lg:text-[5.5rem] font-semibold tracking-extra-tight text-white max-w-5xl leading-[1.02] text-balance animate-fade-in-up">
          The Grok-native
          <br />
          <span className="bg-gradient-to-r from-claw-300 via-claw-500 to-sea-400 bg-clip-text text-transparent">
            Meme Coin Launch Agent
          </span>
        </h1>

        <p className="mt-7 text-zinc-400 text-lg md:text-xl leading-relaxed max-w-2xl text-balance">
          X CLAW detects real-time memes on X and turns them into autonomous
          Pump.fun launches.
        </p>

        <p className="mt-3 text-sm text-zinc-500">
          Real-time X memes &nbsp;→&nbsp; autonomous token launches.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="btn btn-primary !py-3 !px-5">
            Open the Radar
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/launch" className="btn btn-secondary !py-3 !px-5">
            Launch from your idea
          </Link>
        </div>

        <div className="mt-8 inline-flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-claw-400" />
          Solana mainnet · Phantom / Solflare · X CLAW never holds your keys.
        </div>

        <div className="hairline mt-20 max-w-3xl" />

        <div className="mt-10 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-5">
            The agent loop
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {[
              { k: "Detect", d: "Real-time meme radar across X" },
              { k: "Analyze", d: "Trend, attention, community, on-chain" },
              { k: "Generate", d: "Concept, ticker, copy, full kit" },
              { k: "Launch", d: "Direct Pump.fun execution" },
            ].map((s, i) => (
              <div key={s.k} className="bg-ink-950 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                  Phase 0{i + 1}
                </div>
                <div className="mt-1 text-base font-semibold text-white tracking-tight">
                  {s.k}
                </div>
                <div className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
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
