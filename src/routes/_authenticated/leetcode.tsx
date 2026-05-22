import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLeetcodeStore } from "@/store/leetcodeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, Flame } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { AddEntryDialog, TOPICS, DIFFICULTIES } from "@/components/leetcode-dialog";

export const Route = createFileRoute("/_authenticated/leetcode")({
  component: LeetcodePage,
});

function LeetcodePage() {
  const { user } = useAuth();
  const { entries: data, initialized, fetchEntries, deleteEntry } = useLeetcodeStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (user && !initialized) {
      fetchEntries(user.id);
    }
  }, [user, initialized, fetchEntries]);

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const easy = data.filter((d) => d.difficulty === "Easy").length;
  const med = data.filter((d) => d.difficulty === "Medium").length;
  const hard = data.filter((d) => d.difficulty === "Hard").length;
  const streak = computeStreak(data.map((d) => d.solved_at));
  const heatmap = buildHeatmap(data.map((d) => d.solved_at));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LeetCode Tracker</h1>
          <p className="text-sm text-muted-foreground">Consistency beats intensity.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Log problem</Button>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total solved" value={data.length} />
        <StatCard label="Easy" value={easy} dotClass="bg-success" />
        <StatCard label="Medium" value={med} dotClass="bg-warning" />
        <StatCard label="Hard" value={hard} dotClass="bg-destructive" />
      </div>

      <section className="card-elevated mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Consistency · last 90 days</h2>
          <div className="flex items-center gap-1.5 text-sm">
            <Flame className="h-4 w-4 text-warning" />
            <span className="font-medium">{streak}d</span>
            <span className="text-muted-foreground">streak</span>
          </div>
        </div>
        <Heatmap cells={heatmap} />
      </section>

      <section className="card-elevated mt-6 p-5">
        <h2 className="mb-3 font-semibold">By topic</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {TOPICS.map((t) => {
            const count = data.filter((d) => d.topic === t).length;
            return (
              <div key={t} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <span className="text-sm">{t}</span>
                <span className="text-sm font-medium tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-elevated mt-6 p-5">
        <h2 className="mb-3 font-semibold">Recent problems</h2>
        {data.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            Log your first solved problem to start tracking.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence>
              {data.slice(0, 20).map((d) => (
                <motion.li
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={d.id} 
                  className="flex items-center gap-3 py-2.5"
                >
                  <DifficultyBadge d={d.difficulty} />
                  <span className="flex-1 truncate text-sm">{d.problem_name}</span>
                  <span className="text-xs text-muted-foreground">{d.topic}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(d.solved_at), "MMM d")}</span>
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  <button onClick={() => handleDelete(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <AddEntryDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function StatCard({ label, value, dotClass }: { label: string; value: number; dotClass?: string }) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {dotClass && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function DifficultyBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    Easy: "bg-success/15 text-success ring-success/30",
    Medium: "bg-warning/15 text-warning ring-warning/30",
    Hard: "bg-destructive/15 text-destructive ring-destructive/30",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ring-1 ${map[d]}`}>{d}</span>;
}

function Heatmap({ cells }: { cells: { date: string; count: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {cells.map((c) => {
        const intensity = c.count === 0 ? 0 : Math.min(4, c.count);
        const bg = ["bg-surface-2", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"][intensity];
        return <div key={c.date} title={`${c.date}: ${c.count}`} className={`h-3 w-3 rounded-sm ${bg}`} />;
      })}
    </div>
  );
}

function buildHeatmap(dates: string[]) {
  const days = eachDayOfInterval({ start: subDays(new Date(), 89), end: new Date() });
  const counts = new Map<string, number>();
  dates.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1));
  return days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, count: counts.get(key) ?? 0 };
  });
}
function computeStreak(dates: string[]) {
  const set = new Set(dates);
  let s = 0; let cur = new Date();
  while (set.has(format(cur, "yyyy-MM-dd"))) { s++; cur = subDays(cur, 1); }
  return s;
}


