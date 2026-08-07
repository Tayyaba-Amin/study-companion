import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  FileText,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            ref={triggerRef}
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-150 cursor-pointer text-foreground"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <span className="font-heading text-lg font-semibold text-primary lg:hidden">
            Study Companion
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors duration-150 cursor-pointer text-foreground/70 hover:text-foreground"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium">{user.email}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-muted transition-colors duration-150 cursor-pointer text-foreground/70 hover:text-destructive"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile slide-in drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 w-72 bg-background shadow-xl z-50 transition-transform duration-250 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <span className="font-heading text-lg font-semibold text-primary">
            Study Companion
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-muted cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="py-2 px-2 flex flex-col gap-1" role="navigation">
          {[
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { label: "My Documents", href: "/documents", icon: FileText },
            { label: "Study Workspace", href: "/workspace", icon: BookOpen },
            { label: "Profile", href: "/profile", icon: User },
            { label: "Settings", href: "/settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => {
                navigate(item.href);
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer text-sm text-left"
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
          <hr className="my-2 border-border" />
          <button
            onClick={() => {
              toggleTheme();
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer text-sm text-left"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 shrink-0" />
            ) : (
              <Moon className="w-5 h-5 shrink-0" />
            )}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </nav>
      </div>
    </>
  );
}
