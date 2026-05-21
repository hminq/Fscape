import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export default function NotificationNavButton({ to }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications/unread-count");
      setUnreadCount(res.count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const handleUnreadChanged = (event) => {
      const nextCount = event?.detail?.count;
      if (typeof nextCount === "number") {
        setUnreadCount(Math.max(0, nextCount));
        return;
      }
      fetchUnread();
    };

    window.addEventListener("notifications:unread-changed", handleUnreadChanged);
    return () => {
      window.removeEventListener("notifications:unread-changed", handleUnreadChanged);
    };
  }, [fetchUnread]);

  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-lg border transition-colors",
        isActive
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
      aria-label="Thông báo"
      title="Thông báo"
    >
      <Bell className="size-4.5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] font-bold leading-4 text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
