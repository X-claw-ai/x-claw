import KokiLogo from "./KokiLogo";

export default function Footer() {
  return (
    <footer className="border-t-[1.5px] border-ink-1000 mt-32 bg-koki-500">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-3 text-sm text-ink-1000">
        <div>
          <KokiLogo height={28} bare />
          <p className="mt-4 text-ink-1000/72 leading-relaxed max-w-xs font-medium">
            Grok-native Meme Coin Launch Agent. Detect → Analyze → Generate → Launch → Monitor. From meme idea to Pump.fun launch.
          </p>
        </div>
        <div>
          <div className="eyebrow !text-[10px] mb-4">Safety</div>
          <ul className="space-y-2 text-ink-1000 font-bold">
            <li>Agent prepares.</li>
            <li>User approves.</li>
            <li>Wallet signs.</li>
            <li>Launch executes.</li>
          </ul>
        </div>
        <div>
          <div className="eyebrow !text-[10px] mb-4">Disclaimers</div>
          <p className="text-ink-1000/72 leading-relaxed max-w-sm font-medium">
            koki.ai is an independent open-source project. Not affiliated with
            xAI, X, Grok, Pump.fun, PumpPortal, or Solana. Memecoin launches
            involve risk. Nothing here is financial advice.
          </p>
        </div>
      </div>
      <div className="border-t-[1.5px] border-ink-1000">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between text-[11px] font-extrabold text-ink-1000 tracking-tight">
          <span>© {new Date().getFullYear()} koki.ai · $KOKI</span>
          <span className="opacity-70">From meme idea to Pump.fun launch.</span>
        </div>
      </div>
    </footer>
  );
}
