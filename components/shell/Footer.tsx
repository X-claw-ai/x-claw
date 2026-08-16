import KokiLogo from "./KokiLogo";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-32 bg-bg">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-3 text-sm text-ink-300">
        <div>
          <KokiLogo height={40} className="rounded-md overflow-hidden" />
          <p className="mt-4 text-ink-300/72 leading-relaxed max-w-xs font-medium">
            Autonomous Meme Coin Launch Agent. Detect → Analyze → Generate → Launch → Monitor. From meme idea to live launch on Robinhood Chain.
          </p>
          {/* Official X — the navbar hides its X icon on mobile, so the
              footer carries the link on every viewport. */}
          <a
            href="https://x.com/hamrdotfun"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="HAMR on X"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-[12px] font-extrabold text-ink-300/85 hover:text-ink-300 hover:border-koki-500/60 transition-colors"
          >
            <svg viewBox="0 0 1200 1227" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
            </svg>
            @hamrdotfun
          </a>
        </div>
        <div>
          <div className="eyebrow !text-[10px] mb-4">Safety</div>
          <ul className="space-y-2 text-ink-300 font-bold">
            <li>Agent prepares.</li>
            <li>User approves.</li>
            <li>Wallet signs.</li>
            <li>Launch executes.</li>
          </ul>
        </div>
        <div>
          <div className="eyebrow !text-[10px] mb-4">Disclaimers</div>
          <p className="text-ink-300/72 leading-relaxed max-w-sm font-medium">
            hamr.fun is an independent open source project. Not affiliated with
            xAI, X, Robinhood, or Uniswap. Memecoin launches
            involve risk. Nothing here is financial advice.
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--border-strong)]">
        <div className="mx-auto max-w-7xl px-6 h-14 flex flex-wrap items-center justify-between gap-3 text-[11px] font-extrabold text-ink-300 tracking-tight">
          <span>© {new Date().getFullYear()} hamr.fun, $HAMR</span>
          <a
            href="https://github.com/koki-ai-agent/Koki/commit/ae5ff49"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-300/80 hover:text-ink-300 underline-offset-4 hover:underline"
            title="First public commit: ae5ff49 on 2026-05-04"
          >
            Original since 2026-05-04 · commit ae5ff49
          </a>
          <span className="opacity-70">From meme idea to live launch on Robinhood Chain.</span>
        </div>
      </div>
    </footer>
  );
}
