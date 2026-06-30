import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string })?.error ?? res.statusText);
  }
  return res.json();
}

interface AppNotification {
  id: number;
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  isRead: boolean;
  createdAt: string;
}

const ENTITY_COLORS: Record<string, string> = {
  leave_application: "bg-green-500",
  wfh_request: "bg-blue-500",
  expense_claim: "bg-violet-500",
  shift_change_request: "bg-orange-500",
  permission_application: "bg-amber-500",
  attendance_regularization: "bg-cyan-500",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<AppNotification[]>("/notifications"),
    refetchInterval: open ? false : 30_000,
    staleTime: 10_000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => apiFetch<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const unreadCount = countData?.count ?? 0;

  const markRead = useMutation({
    mutationFn: (ids?: number[]) =>
      apiFetch("/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationIds: ids }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
          data-testid="topbar-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[1.125rem] h-[1.125rem] rounded-full bg-primary text-primary-foreground ring-2 ring-background text-[10px] font-semibold flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground gap-1"
              onClick={() => markRead.mutate(unreadIds)}
              disabled={markRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[360px]">
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
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Inbox className="w-7 h-7 text-muted-foreground/40" />
              <span>No notifications yet</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const dotColor = ENTITY_COLORS[n.entityType ?? ""] ?? "bg-muted-foreground";
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 flex gap-3 transition-colors",
                      n.isRead ? "hover:bg-muted/40" : "bg-primary/5 hover:bg-primary/10",
                    )}
                    onClick={() => !n.isRead && markRead.mutate([n.id])}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && !n.isRead && markRead.mutate([n.id])}
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor)} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", n.isRead ? "text-foreground/80" : "text-foreground font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 self-start mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setOpen(false); markRead.mutate(undefined); }}
              >
                Clear all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
