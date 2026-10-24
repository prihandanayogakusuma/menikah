import { cn } from "@/lib/utils";

export function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-stone-100", className)}>
      <div className={cn("h-full rounded-full bg-primary-500 transition-all", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}
