import Link from "next/link";
import WalletPill from "./WalletPill";
import KokiLogo from "./KokiLogo";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "Launches" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-koki-500/85 border-b-[1.5px] border-ink-1000">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <KokiLogo height={26} bare />
          <span className="hidden sm:inline eyebrow text-ink-1000/70 !text-[10px]">
            Meme Coin Launch Agent
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-[13px] font-extrabold tracking-tight text-ink-1000/80 hover:text-ink-1000 rounded-md hover:bg-ink-1000/10 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletPill />
          <Link href="/launch" className="btn btn-primary !py-1.5 !px-3 !text-xs">
            Launch ↗
          </Link>
        </div>
      </div>
    </header>
  );
}
