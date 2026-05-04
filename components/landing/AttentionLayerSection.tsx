import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";

export default function AttentionLayerSection() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-koki-400 flex items-center gap-2">
            <Radar className="h-3 w-3" />
            Attention layer
          </div>
          <h2 className="mt-3 text-display text-4xl md:text-6xl font-semibold tracking-extra-tight text-white leading-[1.05] text-balance">
            Most launch tools wait for an idea.
            <br />
            <span className="text-zinc-500">KOKi watches first.</span>
          </h2>
          <p className="mt-6 text-zinc-400 text-lg leading-relaxed max-w-2xl text-balance">
            KOKi analyzes X-native meme signals, community momentum, and
            on-chain relevance before generating a launch kit and preparing
            Pump.fun execution. You start at the top of the funnel — not from
            a blank form.
          </p>

          <div className="mt-10">
            <Link href="/dashboard" className="btn btn-primary !py-3 !px-5">
              Open the Meme Radar
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="ml-4 text-xs text-zinc-500">
              Real-time trends connect once X API is wired.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
