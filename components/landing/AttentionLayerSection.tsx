import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";
import MemeRadarSection from "@/components/meme-radar/MemeRadarSection";

export default function AttentionLayerSection() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-claw-500">
              <Radar className="h-3.5 w-3.5" />
              Attention layer
            </div>
            <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Most launch tools wait for users to bring an idea. X CLAW
              watches the attention layer first.
            </h2>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              X CLAW analyzes X-native meme signals, community momentum, and
              on-chain relevance before generating a launch kit and preparing
              Pump.fun execution. You start from the top of the funnel, not
              from a blank form.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-claw-500 text-ink-950 px-4 py-2 text-sm font-semibold hover:bg-claw-400 transition"
              >
                <Radar className="h-4 w-4" />
                Open the Meme Radar
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 text-xs text-zinc-500 leading-relaxed">
              Today the radar runs on a curated mock feed so the flow is
              demoable without API keys. Real X / xAI / on-chain signals plug
              in via the same RadarMeme shape later.
            </div>
          </div>

          <div className="lg:col-span-7">
            <MemeRadarSection showHeader={false} compact />
          </div>
        </div>
      </div>
    </section>
  );
}
