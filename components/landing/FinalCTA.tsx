import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="border-t border-[var(--border)] bg-bg relative overflow-hidden">
      <svg
        viewBox="0 0 32 32"
        className="absolute -left-24 -top-24 w-[420px] h-[420px] opacity-[0.07] pointer-events-none"
        aria-hidden
      >
        <ellipse cx="16" cy="22" rx="7.5" ry="6" fill="#0B0B0B" />
        <ellipse cx="6.5" cy="13" rx="2.6" ry="3.2" fill="#0B0B0B" />
        <ellipse cx="11.5" cy="8.5" rx="2.6" ry="3.2" fill="#0B0B0B" />
        <ellipse cx="20.5" cy="8.5" rx="2.6" ry="3.2" fill="#0B0B0B" />
        <ellipse cx="25.5" cy="13" rx="2.6" ry="3.2" fill="#0B0B0B" />
      </svg>

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
        <h2 className="text-display text-display-md text-balance max-w-3xl mx-auto">
          One sig. One memecoin.
          <br />
          <span className="stamp">Live</span> on Pump.fun.
        </h2>
        <p className="mt-6 text-ink-300/80 text-base md:text-lg max-w-xl mx-auto font-bold">
          $KOKI · Grok-native · X-native · open source.
        </p>
        <div className="mt-9 flex justify-center gap-3 flex-wrap">
          <Link href="/launch" className="btn btn-primary !py-3.5 !px-6 !text-base">
            Launch a Memecoin
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary !py-3.5 !px-6 !text-base">
            See agent launches
          </Link>
        </div>
      </div>
    </section>
  );
}
