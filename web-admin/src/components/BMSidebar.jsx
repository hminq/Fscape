import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  SquaresFour,
  Door,
  Package,
  FileText,
  ChatCircleText,
  CaretDown,
  Users,
  CalendarCheck,
  Scales,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import fscapeLogo from "@/assets/fscape-logo.svg";

const BM_PREFIX = "/building-manager";

const navItems = [
  {
    label: "Tổng quan",
    icon: SquaresFour,
    to: BM_PREFIX,
  },
  {
    label: "Phòng",
    icon: Door,
    to: `${BM_PREFIX}/rooms`,
  },
  {
    label: "Cư dân",
    icon: Users,
    to: `${BM_PREFIX}/residents`,
  },
  {
    label: "Đặt phòng",
    icon: CalendarCheck,
    to: `${BM_PREFIX}/bookings`,
    children: [{ label: "Danh sách", to: `${BM_PREFIX}/bookings` }],
  },
  {
    label: "Yêu cầu",
    icon: ChatCircleText,
    to: `${BM_PREFIX}/requests`,
    children: [
      { label: "Danh sách", to: `${BM_PREFIX}/requests` },
      { label: "Phân công", to: `${BM_PREFIX}/requests/assign` },
    ],
  },
  {
    label: "Hợp đồng",
    icon: FileText,
    to: `${BM_PREFIX}/contracts`,
    children: [
      { label: "Danh sách", to: `${BM_PREFIX}/contracts` },
      { label: "Chờ ký", to: `${BM_PREFIX}/contracts/pending` },
    ],
  },
  {
    label: "Quyết toán",
    icon: Scales,
    to: `${BM_PREFIX}/settlements`,
  },
  {
    label: "Tài sản",
    icon: Package,
    to: `${BM_PREFIX}/assets`,
  },
];

function SidebarItem({ item }) {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = location.pathname === item.to ||
    item.children?.some((child) => location.pathname === child.to);
  const [open, setOpen] = useState(isActive);

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
              : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )
        }
      >
        <item.icon className="size-5 shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="size-5 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <CaretDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
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
                      : "text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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

export default function BMSidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar py-4">
      <div className="flex items-center px-4 mb-6">
        <NavLink to={BM_PREFIX} className="flex items-center gap-2.5 shrink-0">
          <img src={fscapeLogo} alt="FScape" className="size-9" />
          <span className="text-2xl font-display tracking-wide text-sidebar-foreground leading-none translate-y-px">
            FSCAPE
          </span>
        </NavLink>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </nav>
    </aside>
  );
}
