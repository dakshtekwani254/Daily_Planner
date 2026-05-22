import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useEffect } from "react";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import {
  Activity, CheckCircle2, Clock, Flame, Target, TrendingUp,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useTaskStore } from "@/store/taskStore";
import { useSessionStore } from "@/store/sessionStore";
import { useLeetcodeStore } from "@/store/leetcodeStore";
import { useProjectStore } from "@/store/projectStore";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  
  const { tasks, initialized: tasksInit, fetchTasks } = useTaskStore();
  const { sessions, initialized: sessionsInit, fetchSessions } = useSessionStore();
  const { entries: leet, initialized: leetInit, fetchEntries } = useLeetcodeStore();
  const { projects, initialized: projectsInit, fetchProjects } = useProjectStore();

  useEffect(() => {
    if (user) {
      if (!tasksInit) fetchTasks(user.id);
      if (!sessionsInit) fetchSessions(user.id);
      if (!leetInit) fetchEntries(user.id);
      if (!projectsInit) fetchProjects(user.id);
    }
  }, [user, tasksInit, sessionsInit, leetInit, projectsInit, fetchTasks, fetchSessions, fetchEntries, fetchProjects]);

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const weekAgo = subDays(new Date(), 6).toISOString();

  const todays = tasks.filter((t) => {
    if (!t.scheduled_for) return false;
    return t.scheduled_for >= todayStart && t.scheduled_for <= todayEnd;
  }).sort((a, b) => {
    // Priority 'urgent' > 'high' > 'medium' > 'low'
    const pMap: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    const pA = pMap[a.priority] ?? 0;
    const pB = pMap[b.priority] ?? 0;
    if (pA !== pB) return pB - pA;
    if (a.scheduled_for && b.scheduled_for) return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
    return 0;
  });

  const recentSessions = sessions.filter(s => s.started_at >= weekAgo);
  const recentLeet = leet.filter(e => e.solved_at >= format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const activeProjects = projects.filter(p => p.stage !== "Completed");

  const completedToday = todays.filter((t) => t.status === "done").length;
  const focusSecondsToday = recentSessions
    .filter((s) => s.started_at >= todayStart)
    .reduce((a, s) => a + (s.actual_seconds ?? 0), 0);
  const focusHoursToday = (focusSecondsToday / 3600).toFixed(1);
  const streak = computeStreak(recentLeet.map((e) => e.solved_at));

  const weekData = useMemo(() => buildWeekData(recentSessions), [recentSessions]);
  const focusScore = Math.min(100, Math.round((focusSecondsToday / 3600 / 4) * 100));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Good {greet()}, <span className="gradient-text">{firstName(user?.user_metadata?.full_name || user?.email)}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
          Realtime synced
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Target} label="Focus score" value={`${focusScore}`} hint="out of 100" />
        <Stat icon={Clock} label="Deep work today" value={`${focusHoursToday}h`} hint="goal: 4h" />
        <Stat icon={CheckCircle2} label="Tasks done today" value={`${completedToday}/${todays.length}`} hint="scheduled" />
        <Stat icon={Flame} label="LeetCode streak" value={`${streak}d`} hint="keep going" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card-elevated p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Today's priorities</h2>
            <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          {todays.length === 0 ? (
            <EmptyHint text="Nothing scheduled. Use ⌘K → New task to capture one." />
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence>
                {todays.slice(0, 6).map((t) => (
                  <motion.li
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={t.id} 
                    className="flex items-center gap-3 py-2.5"
                  >
                    <PriorityDot priority={t.priority} />
                    <span className={t.status === "done" ? "flex-1 text-muted-foreground line-through" : "flex-1"}>
                      {t.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.scheduled_for ? format(new Date(t.scheduled_for), "HH:mm") : ""}</span>
                    <CategoryChip label={t.category} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section className="card-elevated p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Weekly focus</h2>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.16 250)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.16 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1B1D21", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(v: number) => [`${v.toFixed(1)}h`, "Focus"]}
                />
                <Area type="monotone" dataKey="hours" stroke="oklch(0.72 0.16 250)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card-elevated p-5">
          <h2 className="mb-3 font-semibold">Active projects</h2>
          {activeProjects.length === 0 ? (
            <EmptyHint text="No active projects yet." />
          ) : (
            <ul className="space-y-3">
              {activeProjects.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.stage}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${p.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-elevated p-5">
          <h2 className="mb-3 font-semibold">LeetCode recap (30d)</h2>
          <LeetMini entries={recentLeet} />
        </section>

        <section className="card-elevated p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> AI insight</h2>
          <p className="text-sm text-muted-foreground">
            {generateInsight({ focusHours: parseFloat(focusHoursToday), completedToday, total: todays.length, streak })}
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string }) {
  return (
    <div className="card-elevated p-5">
      <div className="mb-3 grid h-8 w-8 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/20">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-destructive", high: "bg-warning", medium: "bg-primary", low: "bg-muted-foreground",
  };
  return <span className={`h-2 w-2 rounded-full ${map[priority] ?? "bg-muted-foreground"}`} />;
}

function CategoryChip({ label }: { label: string }) {
  return <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>;
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-border bg-surface/40 px-4 py-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function LeetMini({ entries }: { entries: { difficulty: string; solved_at: string }[] }) {
  const easy = entries.filter((e) => e.difficulty === "Easy").length;
  const med = entries.filter((e) => e.difficulty === "Medium").length;
  const hard = entries.filter((e) => e.difficulty === "Hard").length;
  const total = entries.length || 1;
  return (
    <div>
      <div className="text-2xl font-semibold">{entries.length}<span className="text-base text-muted-foreground"> solved</span></div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="bg-success transition-all duration-500" style={{ width: `${(easy / total) * 100}%` }} />
        <div className="bg-warning transition-all duration-500" style={{ width: `${(med / total) * 100}%` }} />
        <div className="bg-destructive transition-all duration-500" style={{ width: `${(hard / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Easy {easy}</span><span>Med {med}</span><span>Hard {hard}</span>
      </div>
    </div>
  );
}

function buildWeekData(sessions: { started_at: string; actual_seconds: number | null }[]) {
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  return days.map((d) => {
    const dayStr = format(d, "yyyy-MM-dd");
    const hours = sessions
      .filter((s) => s.started_at.startsWith(dayStr))
      .reduce((a, s) => a + (s.actual_seconds || 0), 0) / 3600;
    return { day: format(d, "EEE"), hours: +hours.toFixed(2) };
  });
}

function computeStreak(dates: string[]) {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  let cursor = new Date();
  while (set.has(format(cursor, "yyyy-MM-dd"))) {
    streak++; cursor = subDays(cursor, 1);
  }
  return streak;
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
function firstName(s?: string) { return (s || "builder").split(/[ @]/)[0]; }

function generateInsight({ focusHours, completedToday, total, streak }: { focusHours: number; completedToday: number; total: number; streak: number }) {
  if (focusHours >= 4) return "You've crossed your deep work goal. Consider a 20-minute walk and lighter admin work next.";
  if (streak >= 7) return `Strong ${streak}-day consistency streak. Lock in tomorrow morning — momentum compounds.`;
  if (total > 0 && completedToday / total > 0.7) return "Great execution rate today. Capture one shipping artifact before sunset.";
  if (focusHours < 1) return "Low focus time so far. Start a 25-minute Pomodoro on your most important task.";
  return "Pick the smallest priority task and start a 25-minute timer. Output > planning.";
}
