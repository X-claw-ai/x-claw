import Link from "next/link";
import WalletPill from "./WalletPill";
import { KokiMark } from "./KokiMark";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "Launches" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-ink-1000/70 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <KokiMark size={28} />
          <span className="font-semibold tracking-tight text-white">
            KOKi<span className="text-koki-500">.ai</span>
          </span>
          <span className="ml-2 text-[11px] text-zinc-500 hidden sm:inline tracking-tight">
            Meme Coin Launch Agent
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletPill />
          <Link href="/launch" className="btn btn-primary !py-1.5 !px-3 !text-xs">
            Launch
          </Link>
        </div>
      </div>
    </header>
  );
}
