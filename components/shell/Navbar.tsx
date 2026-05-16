import Link from "next/link";
import WalletPill from "./WalletPill";
import KokiLogo from "./KokiLogo";

const NAV = [
  // /dashboard is wallet-scoped, only the connected wallet's own launches.
  // /launches is public, every coin every KOKi agent has ever shipped.
  { href: "/dashboard", label: "My Launches" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "All Launches" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/85 border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* Show the orange tile against the dark navbar, the chip IS the
              brand mark. `bare` would render the black wordmark only,
              which disappears on dark. */}
          <KokiLogo height={36} className="rounded-md overflow-hidden" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-[13px] font-extrabold tracking-tight text-ink-300/80 hover:text-ink-300 rounded-md hover:bg-ink-1000/10 transition-colors"
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
