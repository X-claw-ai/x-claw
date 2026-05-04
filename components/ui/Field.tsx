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
      <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-ink-1000">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p className="mt-1 text-[11px] text-ink-1000/60 font-medium">{hint}</p>
      )}
    </label>
  );
}

const baseInput =
  "w-full rounded-[10px] bg-cream-50 border-[1.5px] border-ink-1000 px-3 py-2 text-sm font-medium text-ink-1000 placeholder:text-ink-1000/40 outline-none focus:ring-2 focus:ring-ink-1000/30 transition";

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
