"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import WalletPill from "./WalletPill";
import KokiLogo from "./KokiLogo";

const NAV = [
  // /dashboard is wallet-scoped, only the connected wallet's own launches.
  // /launches is public, every coin every HAMR agent has ever shipped.
  { href: "/dashboard", label: "My Launches" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "All Launches" },
];

/** Official HAMR X account. Single source of truth so header + drawer + docs
 *  never drift. */
const HAMR_X_URL = "https://x.com/hamrdotfun";

export default function Navbar() {
  // Mobile drawer state. Closed by default; auto-closes whenever the
  // route changes so navigating to a new page never leaves the menu
  // hanging open on top of the new content.
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/85 border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-20 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 shrink-0">
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

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Official HAMR X account — sits to the left of the wallet pill.
              GitHub icon is intentionally omitted; add it back here if we
              open-source the repo publicly again. */}
          <a
            href={HAMR_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="HAMR on X"
            title="@hamrdotfun"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-300/80 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
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
          <WalletPill />
          <Link
            href="/launch"
            className="hidden sm:inline-flex btn btn-primary !py-1.5 !px-3 !text-xs"
          >
            Launch ↗
          </Link>
          {/* Mobile hamburger — toggles the drawer below. md:hidden keeps
              it off the desktop layout entirely. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-ink-300/85 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer. Slides in under the navbar on phones, hidden on
          md+ where the inline nav handles things. Tap a link → useEffect
          on pathname closes it automatically. */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-bg/95 backdrop-blur-md">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 text-sm font-extrabold tracking-tight text-ink-300 rounded-md hover:bg-ink-1000/10 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
              <Link
                href="/launch"
                onClick={() => setOpen(false)}
                className="btn btn-primary !py-2 !px-4 !text-xs"
              >
                Launch ↗
              </Link>
              <a
                href={HAMR_X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="HAMR on X"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-ink-300/85 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
              >
                <svg viewBox="0 0 1200 1227" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
                </svg>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
