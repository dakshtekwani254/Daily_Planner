import * as React from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarRange, CheckSquare, Timer, Code2, Kanban,
  GraduationCap, BarChart3, Settings, Plus, Play,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNewTask?: () => void;
};

const items = [
  { group: "Navigation", icon: LayoutDashboard, label: "Go to Dashboard", to: "/dashboard" },
  { group: "Navigation", icon: CalendarRange, label: "Open Daily Planner", to: "/planner" },
  { group: "Navigation", icon: CheckSquare, label: "Open Tasks", to: "/tasks" },
  { group: "Navigation", icon: Timer, label: "Open Deep Work", to: "/deep-work" },
  { group: "Navigation", icon: Code2, label: "Open LeetCode Tracker", to: "/leetcode" },
  { group: "Navigation", icon: Kanban, label: "Open Projects", to: "/projects" },
  { group: "Navigation", icon: GraduationCap, label: "Open Learning", to: "/learning" },
  { group: "Navigation", icon: BarChart3, label: "Open Analytics", to: "/analytics" },
  { group: "Navigation", icon: Settings, label: "Open Settings", to: "/settings" },
] as const;

export function CommandPalette({ open, onOpenChange, onNewTask }: Props) {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const i = document.querySelector<HTMLInputElement>("[cmdk-input]");
      i?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-popover shadow-2xl animate-rise"
      >
        <Command className="bg-transparent">
          <Command.Input
            placeholder="Type a command or search…"
            className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto scrollbar-thin p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Actions" className="px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <PaletteItem icon={Plus} label="Create new task" onSelect={() => onNewTask?.()} kbd="N" />
              <PaletteItem icon={Play} label="Start focus session" onSelect={() => { navigate({ to: "/deep-work" }); onOpenChange(false); }} />
            </Command.Group>

            <Command.Group heading="Navigation" className="mt-1 px-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {items.map((item) => (
                <PaletteItem
                  key={item.to}
                  icon={item.icon}
                  label={item.label}
                  onSelect={() => { navigate({ to: item.to }); onOpenChange(false); }}
                />
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({
  icon: Icon, label, onSelect, kbd,
}: { icon: React.ComponentType<{ className?: string }>; label: string; onSelect: () => void; kbd?: string }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground aria-selected:bg-sidebar-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {kbd && <span className="kbd">{kbd}</span>}
    </Command.Item>
  );
}
