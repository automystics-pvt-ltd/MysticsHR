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
  accent?: "default" | "green" | "red" | "amber" | "violet" | "blue";
  onClick?: () => void;
}

const ACCENT_CLASSES: Record<string, { bg: string; text: string; icon: string }> = {
  default: { bg: "bg-primary/10", text: "text-primary", icon: "text-primary" },
  green:   { bg: "bg-emerald-500/10", text: "text-emerald-700", icon: "text-emerald-600" },
  red:     { bg: "bg-red-500/10", text: "text-red-700", icon: "text-red-600" },
  amber:   { bg: "bg-amber-500/10", text: "text-amber-700", icon: "text-amber-600" },
  violet:  { bg: "bg-violet-500/10", text: "text-violet-700", icon: "text-violet-600" },
  blue:    { bg: "bg-blue-500/10", text: "text-blue-700", icon: "text-blue-600" },
};

export function StatCard({ title, value, icon: Icon, description, trend, loading, accent = "default", onClick }: StatCardProps) {
  const colors = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.default;
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === "neutral"
      ? "text-muted-foreground"
      : trend?.positive
      ? trend.direction === "up" ? "text-emerald-600" : "text-red-600"
      : trend?.direction === "up" ? "text-red-600" : "text-emerald-600";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-4 transition-shadow",
        onClick ? "cursor-pointer hover:shadow-md hover:border-border/80 active:scale-[0.99]" : "hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground leading-tight">{title}</p>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
          <Icon className={cn("w-5 h-5", colors.icon)} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
            {trend && (
              <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", trendColor)}>
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
