import Link from "next/link";
import { Sparkles, Rocket } from "lucide-react";
import WalletPill from "./WalletPill";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "My Launches" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-950/70 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-claw-500 to-glow-cyan shadow-neon">
            <Sparkles className="h-4 w-4 text-ink-950" strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tight">
            X<span className="text-claw-500"> CLAW</span>
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 hidden sm:inline">
            Meme Coin Launch Agent
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white rounded-md hover:bg-white/5 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletPill />
          <Link
            href="/launch"
            className="inline-flex items-center gap-1.5 rounded-md bg-claw-500 text-ink-950 px-3 py-1.5 text-xs font-semibold hover:bg-claw-400 transition"
          >
            <Rocket className="h-3.5 w-3.5" />
            Launch
          </Link>
        </div>
      </div>
    </header>
  );
}
