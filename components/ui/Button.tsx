import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "outline" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-claw-500 text-ink-950 hover:bg-claw-400 shadow-[0_8px_30px_-12px_rgba(52,232,158,0.6)]",
  ghost: "bg-white/5 text-zinc-100 hover:bg-white/10",
  outline:
    "border border-white/10 text-zinc-100 hover:border-claw-500/40 hover:text-white",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
};

interface BaseProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition",
        styles[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition",
        styles[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
