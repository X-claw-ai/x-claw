"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import WalletPill from "./WalletPill";
import KokiLogo from "./KokiLogo";

const NAV = [
  // /dashboard is wallet-scoped, only the connected wallet's own launches.
  // /launches is public, every coin every KOKi agent has ever shipped.
  // /team is the founders page — surfaced both inline (always) and in the
  // mobile drawer, so visitors never have to dig for it.
  { href: "/dashboard", label: "My Launches" },
  { href: "/launch", label: "Launch" },
  { href: "/launches", label: "All Launches" },
  { href: "/team", label: "Team" },
];

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

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Team link — always visible (even on mobile) per request. The
              other landing links (My/All Launches, Launch) still live in
              the hamburger drawer to keep the navbar from overflowing on
              narrow phones. */}
          <Link
            href="/team"
            className="md:hidden px-2.5 py-1.5 text-[12px] font-extrabold tracking-tight text-ink-300/85 hover:text-ink-300 rounded-md hover:bg-ink-1000/10 transition-colors"
          >
            Team
          </Link>
          {/* Official KOKi X + GitHub accounts — sit on the LEFT of the
              wallet pill so the brand presence reads before the wallet UI.
              Visible at every breakpoint per request. */}
          <a
            href="https://x.com/officialkokiai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KOKi on X"
            title="@officialkokiai"
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
          <a
            href="https://github.com/koki-ai-agent/Koki"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="KOKi on GitHub"
            title="koki-ai-agent/Koki"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-300/80 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[18px] w-[18px] fill-current"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                clipRule="evenodd"
              />
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
                href="https://x.com/officialkokiai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="KOKi on X"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-ink-300/85 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
              >
                <svg viewBox="0 0 1200 1227" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
                </svg>
              </a>
              <a
                href="https://github.com/koki-ai-agent/Koki"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="KOKi on GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-ink-300/85 hover:text-ink-300 hover:bg-ink-1000/10 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="h-[18px] w-[18px] fill-current" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
