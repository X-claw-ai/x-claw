import { KokiMark } from "./KokiMark";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-32">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-3 text-sm text-zinc-400">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold">
            <KokiMark size={24} />
            KOKi<span className="text-koki-500">.ai</span>
          </div>
          <p className="mt-4 text-zinc-500 leading-relaxed max-w-xs">
            The Grok-native Meme Coin Launch Agent. Detect → Analyze → Generate → Launch → Monitor. From meme idea to Pump.fun launch.
          </p>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">
            Safety
          </div>
          <ul className="space-y-2 text-zinc-300">
            <li>Agent prepares.</li>
            <li>User approves.</li>
            <li>Wallet signs.</li>
            <li>Launch executes.</li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-4">
            Disclaimers
          </div>
          <p className="text-zinc-500 leading-relaxed max-w-sm">
            KOKi.ai is an independent open-source project. Not affiliated with
            xAI, X, Grok, Pump.fun, PumpPortal, or Solana. Memecoin launches
            involve risk. Nothing here is financial advice.
          </p>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} KOKi.ai · $KOKI</span>
          <span>From meme idea to Pump.fun launch.</span>
        </div>
      </div>
    </footer>
  );
}
