"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `pathfinder-theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle light and dark mode"
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-panel text-muted-foreground shadow-sm transition-colors hover:border-border-strong hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <Moon className="theme-icon-moon h-4 w-4" aria-hidden="true" />
      <Sun className="theme-icon-sun h-4 w-4" aria-hidden="true" />
    </button>
  );
}
