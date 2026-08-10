"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Compass, LayoutDashboard, Menu, Rocket, Bookmark, Hammer, Briefcase, FolderGit2, User, X, Map, ListChecks, ChartNoAxesCombined, ChevronDown, PanelsTopLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const PRIMARY_NAV_LINKS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/accelerate", label: "Accelerate", icon: Rocket },
  { href: "/skillforge", label: "SkillForge", icon: Hammer },
  { href: "/roadmap", label: "Plan", icon: Map },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Progress", icon: ChartNoAxesCombined },
] as const;

const WORKSPACE_LINKS = [
  { href: "/projects", label: "Projects", description: "Build and review evidence", icon: FolderGit2 },
  { href: "/jobs", label: "Job Fit", description: "Analyze saved opportunities", icon: Briefcase },
  { href: "/applications", label: "Applications", description: "Track your pipeline", icon: ListChecks },
  { href: "/saved", label: "Saved", description: "Review saved career guides", icon: Bookmark },
] as const;

function isRouteActive(pathname: string | null, href: string) {
  return pathname === href || pathname?.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const { profile, isAuthenticated } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceActive = WORKSPACE_LINKS.some(({ href }) => isRouteActive(pathname, href));

  useEffect(() => {
    if (!workspaceOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!workspaceRef.current?.contains(event.target as Node)) setWorkspaceOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setWorkspaceOpen(false);
      workspaceButtonRef.current?.focus();
    }

    function closeOnFocusOutside(event: FocusEvent) {
      if (!workspaceRef.current?.contains(event.target as Node)) setWorkspaceOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("focusin", closeOnFocusOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("focusin", closeOnFocusOutside);
    };
  }, [workspaceOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="PathFinder home"
        >
          <Image
            src="/pathfinder-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg ring-1 ring-border"
            priority
          />
          <span>PathFinder</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 xl:flex">
          {PRIMARY_NAV_LINKS.slice(0, 4).map(({ href, label, icon: Icon }) => {
            const active = isRouteActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors xl:px-3",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
                title={label}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}

          <div ref={workspaceRef} className="relative">
            <button
              ref={workspaceButtonRef}
              type="button"
              aria-label="Workspace"
              aria-expanded={workspaceOpen}
              aria-controls="workspace-navigation"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 xl:px-3",
                workspaceActive || workspaceOpen
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
              title="Workspace"
              onClick={() => setWorkspaceOpen((open) => !open)}
            >
              <PanelsTopLeft className="h-4 w-4" />
              <span className="hidden xl:inline">Workspace</span>
              <ChevronDown className={cn("hidden h-3.5 w-3.5 transition-transform xl:block", workspaceOpen && "rotate-180")} aria-hidden="true" />
            </button>

            {workspaceOpen && (
              <nav
                id="workspace-navigation"
                aria-label="Workspace navigation"
                className="absolute left-1/2 top-[calc(100%+0.5rem)] w-64 -translate-x-1/2 rounded-xl border border-border bg-panel p-2 shadow-xl"
              >
                {WORKSPACE_LINKS.map(({ href, label, description, icon: Icon }) => {
                  const active = isRouteActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setWorkspaceOpen(false)}
                      className={cn(
                        "flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
                        active ? "bg-accent text-accent-foreground" : "hover:bg-surface",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-muted-foreground">{description}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {PRIMARY_NAV_LINKS.slice(4).map(({ href, label, icon: Icon }) => {
            const active = isRouteActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors xl:px-3",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
                title={label}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <ThemeToggle />
          {isAuthenticated && profile ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
            >
              <User className="h-4 w-4" />
              {profile.name}
              {profile.isDemo && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">Demo</span>
              )}
            </Link>
          ) : (
            <Link href="/profile" className={buttonVariants({ size: "sm" })}>Get Started</Link>
          )}
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-border bg-panel px-6 py-3 shadow-lg xl:hidden">
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
                aria-current={isRouteActive(pathname, href) ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-3" aria-labelledby="mobile-workspace-title">
              <p id="mobile-workspace-title" className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
              {WORKSPACE_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-surface",
                    isRouteActive(pathname, href) && "bg-accent text-accent-foreground",
                  )}
                  aria-current={isRouteActive(pathname, href) ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
            >
              <User className="h-4 w-4" />
              {isAuthenticated && profile ? profile.name : "Get Started"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
