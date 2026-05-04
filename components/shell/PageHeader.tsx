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
    <header className="border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {breadcrumbs && (
          <nav className="text-xs text-zinc-500 flex items-center gap-1 mb-4">
            {breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="flex items-center gap-1">
                {b.href ? (
                  <Link href={b.href} className="hover:text-zinc-300 transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
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
            {eyebrow && (
              <div className="text-[11px] uppercase tracking-[0.18em] text-claw-400">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-2 text-display text-3xl md:text-5xl font-semibold tracking-extra-tight text-white text-balance">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed">
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
