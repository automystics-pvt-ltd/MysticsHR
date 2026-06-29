import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, Activity, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGetDashboardRecentActivity } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const MODULE_COLORS: Record<string, string> = {
  Employees: "bg-blue-500",
  Leave: "bg-green-500",
  Payroll: "bg-violet-500",
  Attendance: "bg-amber-500",
  Recruitment: "bg-pink-500",
  Performance: "bg-cyan-500",
  Onboarding: "bg-orange-500",
  Helpdesk: "bg-red-500",
  Documents: "bg-teal-500",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { data: activityRaw, isLoading } = useGetDashboardRecentActivity({ limit: 6 });
  const activity = Array.isArray(activityRaw) ? activityRaw : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          data-testid="topbar-notifications"
        >
          <Bell className="w-5 h-5" />
          {activity.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Recent Activity</h3>
          <span className="text-xs text-muted-foreground">{activity.length} updates</span>
        </div>
        <ScrollArea className="max-h-[340px]">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-muted mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-4/5" />
                    <div className="h-2.5 bg-muted rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Activity className="w-7 h-7 text-muted-foreground/40" />
              <span>No recent activity</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((item) => {
                const dotColor = MODULE_COLORS[item.module] ?? "bg-muted-foreground";
                return (
                  <div key={item.id} className="px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">{item.actorName}</span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium shrink-0 self-start mt-0.5">
                      {item.module}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {activity.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setOpen(false); setLocation("/communications"); }}
              >
                View all notifications
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
