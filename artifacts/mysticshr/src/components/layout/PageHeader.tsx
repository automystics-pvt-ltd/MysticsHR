import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  backHref?: string;
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  backHref,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between", compact ? "mb-4" : "mb-6", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {backHref && (
          <Link href={backHref}>
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={cn("font-bold text-foreground tracking-tight", compact ? "text-xl" : "text-2xl")}>
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
