import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneClass = {
  primary: "bg-primary-50 text-primary-600",
  gold: "bg-gold-50 text-gold-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  stone: "bg-stone-100 text-stone-600",
} as const;

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof toneClass;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", toneClass[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-stone-900 tabular-nums sm:text-2xl">{value}</p>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
      {children}
    </div>
  );
}
