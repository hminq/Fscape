import { Outlet } from "react-router-dom";
import { CalendarDots } from "@phosphor-icons/react";
import AppSidebar from "../components/AppSidebar";
import NotificationNavButton from "../components/NotificationNavButton";
import UserMenu from "../components/UserMenu";

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border bg-background px-6">
          {/* Date badge */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <CalendarDots className="size-3.5" />
            <span>{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          </div>

          <NotificationNavButton to="/notifications" />
          <UserMenu profilePath="/profile" />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
