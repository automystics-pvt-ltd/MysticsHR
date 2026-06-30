import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
    positive?: boolean;
  };
  loading?: boolean;
  accent?: "default" | "green" | "red" | "amber" | "violet" | "blue" | "pink" | "teal" | "cyan";
  onClick?: () => void;
}

const ACCENT_CLASSES: Record<string, { bg: string; icon: string; border: string }> = {
  default: {
    bg:     "bg-violet-50 dark:bg-violet-950/30",
    icon:   "text-violet-600 dark:text-violet-400",
    border: "border-l-violet-500",
  },
  green: {
    bg:     "bg-emerald-50 dark:bg-emerald-950/30",
    icon:   "text-emerald-600 dark:text-emerald-400",
    border: "border-l-emerald-500",
  },
  red: {
    bg:     "bg-red-50 dark:bg-red-950/30",
    icon:   "text-red-600 dark:text-red-400",
    border: "border-l-red-500",
  },
  amber: {
    bg:     "bg-amber-50 dark:bg-amber-950/30",
    icon:   "text-amber-600 dark:text-amber-400",
    border: "border-l-amber-500",
  },
  violet: {
    bg:     "bg-violet-50 dark:bg-violet-950/30",
    icon:   "text-violet-600 dark:text-violet-400",
    border: "border-l-violet-500",
  },
  blue: {
    bg:     "bg-blue-50 dark:bg-blue-950/30",
    icon:   "text-blue-600 dark:text-blue-400",
    border: "border-l-blue-500",
  },
  pink: {
    bg:     "bg-pink-50 dark:bg-pink-950/30",
    icon:   "text-pink-600 dark:text-pink-400",
    border: "border-l-pink-500",
  },
  teal: {
    bg:     "bg-teal-50 dark:bg-teal-950/30",
    icon:   "text-teal-600 dark:text-teal-400",
    border: "border-l-teal-500",
  },
  cyan: {
    bg:     "bg-cyan-50 dark:bg-cyan-950/30",
    icon:   "text-cyan-600 dark:text-cyan-400",
    border: "border-l-cyan-500",
  },
};

export function StatCard({ title, value, icon: Icon, description, trend, loading, accent = "default", onClick }: StatCardProps) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.default;
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === "neutral"
      ? "text-muted-foreground"
      : trend?.positive
      ? trend.direction === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      : trend?.direction === "up" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 bg-card p-5 flex flex-col gap-4 transition-all duration-150 shadow-sm",
        colors.border,
        onClick ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : "hover:shadow-md"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colors.bg)}>
          <Icon className={cn("w-5 h-5", colors.icon)} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
            {trend && (
              <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", trendColor)}>
                <TrendIcon className="w-3 h-3" />
                {trend.label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
