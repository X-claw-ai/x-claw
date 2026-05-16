import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
  danger:
    "btn !border-[var(--border-strong)] bg-red-600 hover:bg-red-700 text-white",
};

interface BaseProps {
  variant?: Variant;
  className?: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const sizes: Record<NonNullable<BaseProps["size"]>, string> = {
  sm: "!py-1.5 !px-3 !text-xs",
  md: "",
  lg: "!py-3 !px-5 !text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(styles[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link href={href} className={cn(styles[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
