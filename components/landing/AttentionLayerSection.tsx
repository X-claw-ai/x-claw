import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";

export default function AttentionLayerSection() {
  return (
    <section className="border-t border-[var(--border)] bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-28">
        <div className="max-w-4xl">
          <div className="eyebrow flex items-center gap-2">
            <Radar className="h-3 w-3" />
            Attention layer
          </div>
          <h2 className="mt-3 text-display text-display-md text-balance">
            Most launch tools wait for an idea.
            <br />
            <span className="opacity-60">HAMR watches first.</span>
          </h2>
          <p className="mt-6 text-ink-300/80 text-base md:text-lg leading-relaxed max-w-2xl text-balance font-medium">
            HAMR reads X meme signals, community momentum, and onchain
            relevance before drafting a launch kit and preparing the
            execution on Robinhood Chain. You start at the top of the funnel,
            not a blank form.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/launch" className="btn btn-primary !py-3 !px-5">
              Try Auto-pilot
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[12px] font-bold text-ink-300/72">
              Live X search via the x_search tool.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
