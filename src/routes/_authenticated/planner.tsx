import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTaskStore } from "@/store/taskStore";
import { addDays, format, startOfDay, endOfDay, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TaskDialog } from "@/components/task-dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/planner")({
  component: PlannerPage,
});

function PlannerPage() {
  const { user } = useAuth();
  const { tasks, initialized, fetchTasks, updateTask } = useTaskStore();
  const [day, setDay] = React.useState(new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [defaultTime, setDefaultTime] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    if (user && !initialized) {
      fetchTasks(user.id);
    }
  }, [user, initialized, fetchTasks]);

  const dayStart = startOfDay(day).toISOString();
  const dayEnd = endOfDay(day).toISOString();

  const handleToggle = async (id: string, status: string) => {
    const newStatus = status === "done" ? "todo" : "done";
    try {
      await updateTask(id, {
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null
      });
    } catch (e) {
      toast.error("Failed to update task");
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i); // 12 AM - 11 PM
  const byHour = new Map<number, typeof tasks>();
  
  tasks.forEach((t) => {
    if (!t.scheduled_for) return;
    
    const taskDate = new Date(t.scheduled_for);
    const plannerDayStart = startOfDay(day);
    const taskDayStart = startOfDay(taskDate);

    let shouldRender = false;

    if (t.scheduled_for >= dayStart && t.scheduled_for <= dayEnd) {
      shouldRender = true;
    } else if (t.status !== "done" && t.is_recurring && t.recurrence_rule && taskDayStart < plannerDayStart) {
      if (t.recurrence_rule.includes("BYDAY=")) {
        const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const byDayStr = t.recurrence_rule.split("BYDAY=")[1].split(";")[0];
        shouldRender = byDayStr.includes(daysMap[plannerDayStart.getDay()]);
      } else if (t.recurrence_rule === "FREQ=DAILY") {
        shouldRender = true;
      } else if (t.recurrence_rule === "FREQ=WEEKLY") {
        shouldRender = plannerDayStart.getDay() === taskDayStart.getDay();
      } else if (t.recurrence_rule === "FREQ=MONTHLY") {
        shouldRender = plannerDayStart.getDate() === taskDayStart.getDate();
      }
    }

    if (!shouldRender) return;
    
    const h = taskDate.getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(t);
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Daily Planner</h1>
          <p className="text-sm text-muted-foreground">Time-block your way to flow.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setDay(subDays(day, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setDay(new Date())} className="font-medium">{format(day, "EEE, MMM d")}</Button>
          <Button size="icon" variant="ghost" onClick={() => setDay(addDays(day, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="card-elevated overflow-hidden">
        {hours.map((h) => {
          const items = byHour.get(h) ?? [];
          const slot = new Date(day); slot.setHours(h, 0, 0, 0);
          return (
            <div key={h} className="group flex border-b border-border last:border-0">
              <div className="w-16 shrink-0 border-r border-border px-3 py-3 text-xs text-muted-foreground tabular-nums">
                {format(slot, "HH:mm")}
              </div>
              <button
                onClick={() => { setDefaultTime(slot); setDialogOpen(true); }}
                className="flex min-h-[56px] flex-1 flex-col gap-1.5 px-3 py-2 text-left transition-colors hover:bg-surface/60"
              >
                {items.length === 0 ? (
                  <span className="hidden text-xs text-muted-foreground group-hover:flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add block
                  </span>
                ) : (
                  <AnimatePresence>
                    {items.map((t) => {
                      let colors = { bg: "from-primary/10 to-accent/5", dot: "bg-primary", border: "border-border-strong/60" };
                      if (t.priority === "low") colors = { bg: "from-slate-500/10 to-slate-500/5", dot: "bg-slate-500", border: "border-slate-500/20" };
                      else if (t.priority === "high") colors = { bg: "from-yellow-500/10 to-yellow-500/5", dot: "bg-yellow-500", border: "border-yellow-500/20" };
                      else if (t.priority === "urgent") colors = { bg: "from-red-500/10 to-red-500/5", dot: "bg-red-500", border: "border-red-500/20" };

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          key={t.id}
                          onClick={(e) => { e.stopPropagation(); handleToggle(t.id, t.status); }}
                          className={`flex w-full items-center gap-2 rounded-md border ${colors.border} bg-gradient-to-r ${colors.bg} px-2.5 py-1.5 text-sm ${t.status === "done" ? "opacity-50 line-through" : ""}`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                          <span className="flex-1 truncate">{t.title}</span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{t.category}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultDate={defaultTime} />
    </div>
  );
}
