import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  SquaresFour,
  Users,
  Buildings,
  Door,
  Package,
  FileText,
  Receipt,
  ChatCircleText,
  Scroll,
  CaretDown,
  CalendarCheck,
  Scales,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import fscapeLogo from "@/assets/fscape-logo.svg";

const navItems = [
  {
    label: "Tổng quan",
    icon: SquaresFour,
    to: "/",
  },
  {
    label: "Tài khoản",
    icon: Users,
    to: "/accounts",
    children: [{ label: "Danh sách", to: "/accounts" }],
  },
  {
    label: "Tòa nhà",
    icon: Buildings,
    to: "/buildings",
    children: [
      { label: "Danh sách", to: "/buildings" },
      { label: "Tiện ích", to: "/facilities" },
      { label: "Khu vực", to: "/locations" },
      { label: "Trường đại học", to: "/universities" },
    ],
  },
  {
    label: "Phòng",
    icon: Door,
    to: "/rooms",
    children: [
      { label: "Danh sách", to: "/rooms" },
      { label: "Loại phòng", to: "/rooms/types" },
    ],
  },
  {
    label: "Tài sản",
    icon: Package,
    to: "/assets",
    children: [
      { label: "Danh sách", to: "/assets" },
      { label: "Loại tài sản", to: "/assets/types" },
    ],
  },
  {
    label: "Hợp đồng",
    icon: FileText,
    to: "/contracts",
    children: [
      { label: "Danh sách", to: "/contracts" },
      { label: "Mẫu hợp đồng", to: "/contracts/templates" },
    ],
  },
  {
    label: "Hóa đơn",
    icon: Receipt,
    to: "/invoices",
    children: [{ label: "Danh sách", to: "/invoices" }],
  },
  {
    label: "Quyết toán",
    icon: Scales,
    to: "/settlements",
    children: [{ label: "Danh sách", to: "/settlements" }],
  },
  {
    label: "Đặt phòng",
    icon: CalendarCheck,
    to: "/bookings",
    children: [{ label: "Danh sách", to: "/bookings" }],
  },
  {
    label: "Yêu cầu",
    icon: ChatCircleText,
    to: "/requests",
    children: [{ label: "Danh sách", to: "/requests" }],
  },
  {
    label: "Nhật ký",
    icon: Scroll,
    to: "/logs",
    children: [
      { label: "Hoạt động", to: "/logs" },
      { label: "Hệ thống", to: "/logs/system" },
    ],
  },
];

function SidebarItem({ item }) {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isActive =
    location.pathname === item.to ||
    item.children?.some((child) => location.pathname === child.to);
  const [open, setOpen] = useState(isActive);

  // Direct link - no children
  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          )
        }
      >
        <item.icon className="size-5 shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  // Collapsible group
  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/50 hover:text-sidebar-accent-foreground",
        )}
      >
        <item.icon className="size-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <CaretDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-8 border-l border-sidebar-border pl-3 py-1 space-y-0.5">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end
                className={({ isActive }) =>
                  cn(
                    "block rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                    isActive
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppSidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar py-4">
      {/* Logo */}
      <div className="flex items-center px-4 mb-6">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={fscapeLogo} alt="FScape" className="size-9" />
          <span className="text-2xl font-display tracking-wide text-sidebar-foreground leading-none translate-y-px">
            FSCAPE
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </nav>
    </aside>
  );
}
