import Link from "next/link";
import { ArrowRight, Rocket, ShieldCheck, Radar } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-28">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-claw-500">
          <span className="h-1.5 w-1.5 rounded-full bg-claw-500 shadow-neon" />
          $XCLAW · Grok-native meme coin agent
        </div>

        <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] max-w-4xl animate-fade-in-up">
          The{" "}
          <span className="bg-gradient-to-r from-claw-500 via-glow-cyan to-glow-violet bg-clip-text text-transparent">
            Grok-native
          </span>{" "}
          Meme Coin Launch Agent
        </h1>

        <p className="mt-5 max-w-2xl text-zinc-400 text-base md:text-lg leading-relaxed">
          X CLAW detects real-time memes on X and turns them into autonomous
          Pump.fun launches.
        </p>

        <p className="mt-3 inline-flex items-center gap-2 text-sm text-claw-400">
          <Radar className="h-3.5 w-3.5" />
          Real-time X memes → autonomous token launches.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-claw-500 text-ink-950 px-5 py-2.5 text-sm font-semibold hover:bg-claw-400 transition shadow-[0_8px_30px_-12px_rgba(52,232,158,0.6)]"
          >
            <Radar className="h-4 w-4" />
            Open Meme Radar
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/launch"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:border-claw-500/40 hover:text-white transition"
          >
            <Rocket className="h-4 w-4" />
            Launch from your idea
          </Link>
        </div>

        <div className="mt-10 inline-flex items-center gap-2 text-xs text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5 text-claw-500" />
          Solana mainnet · Phantom / Solflare · X CLAW never holds your keys.
        </div>

        {/* The four phases of X CLAW autonomy */}
        <div className="hairline mt-14 mb-6 max-w-3xl" />
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
          Detect → Analyze → Generate → Launch
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
          {[
            { k: "Detect", d: "Real-time meme radar across X" },
            { k: "Analyze", d: "Trend, attention, community, on-chain" },
            { k: "Generate", d: "Concept, ticker, copy, full kit" },
            { k: "Launch", d: "Direct Pump.fun execution" },
          ].map((s, i) => (
            <div key={s.k} className="card p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                Phase 0{i + 1}
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">
                {s.k}
              </div>
              <div className="mt-1 text-xs text-zinc-500 leading-relaxed">
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
