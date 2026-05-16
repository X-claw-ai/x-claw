import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { href?: string; label: string }[];
}) {
  return (
    <header className="border-b border-[var(--border)] bg-bg">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
        {breadcrumbs && (
          <nav className="text-[11px] font-extrabold text-ink-300/70 flex items-center gap-1 mb-4 uppercase tracking-[0.08em]">
            {breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-1">
                {b.href ? (
                  <Link href={b.href} className="hover:text-ink-300 transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-300">{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h1 className="mt-2 text-display text-display-sm md:text-display-md text-balance">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-ink-300/80 text-base md:text-lg max-w-2xl leading-snug font-medium">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
