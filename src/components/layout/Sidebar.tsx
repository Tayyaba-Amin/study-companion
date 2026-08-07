import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { NavItem } from "../../types";

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Documents", href: "/documents", icon: FileText },
  { label: "Study Workspace", href: "/workspace", icon: BookOpen },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border bg-background transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
      aria-label="Main navigation"
    >
      <div
        className={`flex items-center h-16 border-b border-border px-4 ${
          collapsed ? "justify-center" : "gap-3"
        }`}
      >
        {!collapsed && (
          <span className="font-heading text-xl font-semibold text-primary truncate">
            Study Companion
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors duration-150 cursor-pointer text-foreground shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 flex flex-col gap-1" role="navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg transition-colors duration-150 cursor-pointer ${
                collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"
              } ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <span className="truncate text-sm">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-border">
        {!collapsed && (
          <p className="text-xs text-muted-foreground px-3 py-2">
            &copy; {new Date().getFullYear()} Study Companion
          </p>
        )}
      </div>
    </aside>
  );
}
