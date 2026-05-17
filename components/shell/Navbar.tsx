import Link from "next/link";
import WalletPill from "./WalletPill";
import KokiLogo from "./KokiLogo";

const NAV = [
  // /dashboard is wallet-scoped, only the connected wallet's own launches.
  // /launches is public, every coin every KOKi agent has ever shipped.
  // /team is the founders page — hidden from /, surfaced here.
  { href: "/dashboard", label: "My Launches" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "All Launches" },
  { href: "/team", label: "Team" },
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
          {/* Official KOKi X account — far right, after Launch CTA. */}
          <a
            href="https://x.com/officialkokiai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KOKi on X"
            title="@officialkokiai"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-300/80 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
          >
            <svg
              viewBox="0 0 1200 1227"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 fill-current"
              aria-hidden="true"
            >
              <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
