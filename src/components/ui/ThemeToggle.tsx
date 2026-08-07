import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

interface ThemeToggleProps {
  /** When true, renders as a row with a label and switch (for Settings page) */
  labeled?: boolean;
  /** When true, renders compact without tooltip/label (for mobile nav) */
  compact?: boolean;
}

export function ThemeToggle({ labeled, compact }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (labeled) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="w-5 h-5 text-primary" />
          ) : (
            <Sun className="w-5 h-5 text-primary" />
          )}
          <span className="text-sm text-foreground">Dark Mode</span>
        </div>
        <button
          onClick={toggleTheme}
          className={`w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
            isDark ? "bg-primary" : "bg-border"
          }`}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
        >
          <div
            className={`w-4 h-4 rounded-full bg-background shadow transition-transform duration-200 ${
              isDark ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer text-sm w-full text-left"
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {isDark ? (
          <Sun className="w-5 h-5 shrink-0" />
        ) : (
          <Moon className="w-5 h-5 shrink-0" />
        )}
        <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
      </button>
    );
  }

  // Default: icon-only button for header
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-muted transition-colors duration-150 cursor-pointer text-foreground/70 hover:text-foreground"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}