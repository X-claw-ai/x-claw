import Link from "next/link";
import { Rocket, ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-3xl mx-auto leading-tight">
          One signature. One memecoin. Live on Pump.fun.
        </h2>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
          $XCLAW · Grok-native · X-native · open source on GitHub.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/launch"
            className="inline-flex items-center gap-2 rounded-md bg-claw-500 text-ink-950 px-6 py-3 text-base font-semibold hover:bg-claw-400 transition shadow-[0_8px_30px_-12px_rgba(52,232,158,0.6)]"
          >
            <Rocket className="h-5 w-5" />
            Launch a Memecoin
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
