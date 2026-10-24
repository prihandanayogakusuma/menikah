import { CheckCircle2, TrendingDown, Trophy } from "lucide-react";
import type { HealthStatus } from "@/lib/types";
import { HEALTH_LABEL } from "@/lib/calc";
import { cn } from "@/lib/utils";

const STYLE: Record<HealthStatus, { cls: string; icon: typeof CheckCircle2 }> = {
  on_track: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  behind: { cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: TrendingDown },
  achieved: { cls: "bg-gold-50 text-gold-700 ring-gold-300", icon: Trophy },
};

export function HealthBadge({ status, size = "md" }: { status: HealthStatus; size?: "sm" | "md" }) {
  const { cls, icon: Icon } = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        cls,
      )}
    >
      <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {HEALTH_LABEL[status]}
    </span>
  );
}
