import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarRange, CheckSquare, Timer, Code2, Kanban,
  GraduationCap, BarChart3, Settings, Search, Sparkles, Plus, Bell, LogOut, ChevronLeft, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/task-dialog";

import { getServerSession } from "@/integrations/supabase/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getServerSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, kbd: "D" },
  { to: "/planner", label: "Daily Planner", icon: CalendarRange, kbd: "P" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, kbd: "T" },
  { to: "/notes", label: "Notes", icon: FileText, kbd: "N" },
  { to: "/deep-work", label: "Deep Work", icon: Timer, kbd: "F" },
  { to: "/leetcode", label: "LeetCode", icon: Code2, kbd: "L" },
  { to: "/projects", label: "Projects", icon: Kanban, kbd: "J" },
  { to: "/learning", label: "Learning", icon: GraduationCap, kbd: "R" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, kbd: "A" },
  { to: "/settings", label: "Settings", icon: Settings, kbd: "," },
] as const;

function AuthenticatedLayout() {
  const { user, loading, signOut } = useAuth();
  useRealtimeSync();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setTaskOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Loading workspace
        </div>
      </div>
    );
  }

  const initials = (user.user_metadata?.full_name || user.email || "U")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}>
        <div className="flex h-14 items-center gap-2 px-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && <span className="font-semibold tracking-tight">Planner OS</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:inline-flex"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-2 py-2">
          {nav.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />}
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="kbd opacity-0 group-hover:opacity-100">{item.kbd}</span>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <div className={cn("flex items-center gap-2 rounded-md p-2", collapsed && "justify-center")}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{user.user_metadata?.full_name || user.email}</div>
                <button onClick={signOut} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-2 md:max-w-md"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search or run command…</span>
            <span className="hidden gap-1 md:flex">
              <span className="kbd">Ctrl</span><span className="kbd">K</span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" onClick={() => setTaskOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New task</span>
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNewTask={() => { setPaletteOpen(false); setTaskOpen(true); }}
      />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
    </div>
  );
}
