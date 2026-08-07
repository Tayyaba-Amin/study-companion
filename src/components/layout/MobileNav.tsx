import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  User,
} from "lucide-react";
import type { NavItem } from "../../types";

const mobileNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Workspace", href: "/workspace", icon: BookOpen },
  { label: "Profile", href: "/profile", icon: User },
];

export function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 border-t border-border bg-background pb-safe z-40"
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/dashboard"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "text-primary"
                  : "text-foreground/60 hover:text-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
