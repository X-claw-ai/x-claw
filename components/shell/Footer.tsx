export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 grid gap-6 md:grid-cols-3 text-sm text-zinc-400">
        <div>
          <div className="font-semibold text-zinc-100">X CLAW</div>
          <p className="mt-2 text-zinc-500 leading-relaxed">
            The Grok-native Meme Coin Launch Agent. X attention, community
            momentum, and on-chain intelligence — into autonomous launch
            execution. From meme idea to Pump.fun launch.
          </p>
        </div>
        <div>
          <div className="font-semibold text-zinc-100">Safety</div>
          <ul className="mt-2 space-y-1 text-zinc-500">
            <li>Agent prepares.</li>
            <li>User approves.</li>
            <li>Wallet signs.</li>
            <li>Launch executes.</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-zinc-100">Disclaimers</div>
          <p className="mt-2 text-zinc-500 leading-relaxed">
            X CLAW is an independent open-source project. Not affiliated with
            xAI, X, Grok, Pump.fun, PumpPortal, or Solana. Memecoin launches
            involve risk. Nothing here is financial advice.
          </p>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 h-12 flex items-center justify-between text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} X CLAW · $XCLAW</span>
          <span>From meme idea to Pump.fun launch.</span>
        </div>
      </div>
    </footer>
  );
}
