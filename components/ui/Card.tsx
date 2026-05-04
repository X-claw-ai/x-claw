import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  hoverable = false,
}: {
  className?: string;
  children: React.ReactNode;
  hoverable?: boolean;
}) {
  return (
    <div className={cn("card p-5", hoverable && "card-hover", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3 className={cn("text-base font-semibold text-ink-1000", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-sm text-ink-1000/72 leading-relaxed", className)}>
      {children}
    </p>
  );
}
