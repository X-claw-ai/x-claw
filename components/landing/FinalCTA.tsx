import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 text-center">
        <h2 className="text-display text-4xl md:text-6xl font-semibold tracking-extra-tight text-white max-w-3xl mx-auto leading-[1.05] text-balance">
          One signature. One memecoin.
          <br />
          <span className="text-zinc-500">Live on Pump.fun.</span>
        </h2>
        <p className="mt-6 text-zinc-400 text-lg max-w-xl mx-auto">
          $KOKI · Grok-native · X-native · open source on GitHub.
        </p>
        <div className="mt-10 flex justify-center gap-3 flex-wrap">
          <Link href="/launch" className="btn btn-primary !py-3.5 !px-6 !text-base">
            Launch a Memecoin
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary !py-3.5 !px-6 !text-base">
            Open the Radar
          </Link>
        </div>
      </div>
    </section>
  );
}
