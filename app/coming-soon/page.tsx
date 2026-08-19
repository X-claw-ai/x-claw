import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HAMR.fun — Coming soon",
  description:
    "One click. The internet's hottest meme becomes a coin. Launching soon on Robinhood Chain.",
};

// Full-screen takeover — sits above the navbar, footer, and chat that
// the root layout renders, so while the gate is up visitors see ONLY
// this. Removing the middleware flag brings the whole site back.

export default function ComingSoonPage() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0A0F] overflow-hidden">
      {/* Violet glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 35%, rgba(139,92,246,0.16) 0%, rgba(10,10,15,0) 65%)",
        }}
      />

      <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
        <Image
          src="/hamr-logo.png"
          alt="HAMR"
          width={96}
          height={96}
          priority
          className="mb-6 animate-wag"
        />

        <div className="text-[13px] font-black tracking-[0.35em] text-koki-300 uppercase">
          hamr.fun
        </div>

        <h1 className="mt-4 text-display text-[clamp(40px,9vw,88px)] text-white">
          Coming soon<span className="text-koki-500">.</span>
        </h1>

        <p className="mt-5 max-w-md text-[15px] font-medium text-ink-300/70 leading-relaxed">
          One click. The internet&apos;s hottest meme becomes a coin —
          launched by an agent, live on Robinhood Chain.
        </p>

        <a
          href="https://x.com/hamrdotfun"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2.5 rounded-xl border border-koki-500/40 bg-koki-500/10 px-5 py-3 text-[13px] font-extrabold text-white hover:bg-koki-500/20 hover:border-koki-500/70 transition-colors"
        >
          <svg viewBox="0 0 1200 1227" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
          </svg>
          Follow @hamrdotfun for the launch
        </a>

        <div className="absolute bottom-6 inset-x-0 text-[11px] font-bold text-ink-300/35">
          © {new Date().getFullYear()} hamr.fun · Robinhood Chain
        </div>
      </div>
    </div>
  );
}
