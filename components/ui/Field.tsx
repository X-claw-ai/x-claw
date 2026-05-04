import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </label>
  );
}

const baseInput =
  "w-full rounded-md bg-ink-800 border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-koki-500/50 focus:ring-2 focus:ring-koki-500/20 transition";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(baseInput, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={cn(baseInput, "min-h-[96px] resize-y", props.className)}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(baseInput, "appearance-none pr-8", props.className)}
    />
  );
}
