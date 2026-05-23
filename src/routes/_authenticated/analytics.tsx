import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTaskStore } from "@/store/taskStore";
import { useSessionStore } from "@/store/sessionStore";
import { format, subDays, eachDayOfInterval } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const CAT_COLORS = ["var(--primary)", "var(--accent)", "oklch(0.72 0.16 160)", "oklch(0.78 0.16 80)", "oklch(0.65 0.22 25)", "oklch(0.62 0.14 200)", "oklch(0.7 0.1 320)"];

function AnalyticsPage() {
  const { user } = useAuth();
  const { tasks, initialized: tasksInit, fetchTasks } = useTaskStore();
  const { sessions, initialized: sessionsInit, fetchSessions } = useSessionStore();

  React.useEffect(() => {
    if (user) {
      if (!tasksInit) fetchTasks(user.id);
      if (!sessionsInit) fetchSessions(user.id);
    }
  }, [user, tasksInit, sessionsInit, fetchTasks, fetchSessions]);

  const thirtyDaysAgo = subDays(new Date(), 29).toISOString();
  
  const recentTasks = tasks.filter(t => t.created_at >= thirtyDaysAgo);
  const recentSessions = sessions.filter(s => s.started_at >= thirtyDaysAgo);

  const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
  const focusByDay = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const hours = recentSessions.filter((s) => s.started_at.startsWith(key))
      .reduce((a, s) => a + (s.actual_seconds ?? 0), 0) / 3600;
    return { day: format(d, "MMM d"), hours: +hours.toFixed(2) };
  });
  
  const tasksByDay = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const created = recentTasks.filter((t) => t.created_at.startsWith(key)).length;
    const done = recentTasks.filter((t) => t.completed_at?.startsWith(key)).length;
    return { day: format(d, "MMM d"), created, done };
  });
  
  const catCounts = recentTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});
  const catData = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

  const totalFocus = recentSessions.reduce((a, s) => a + (s.actual_seconds ?? 0), 0) / 3600;
  const totalDone = recentTasks.filter((t) => t.status === "done").length;
  const totalCreated = recentTasks.length;
  const completion = totalCreated > 0 ? Math.round((totalDone / totalCreated) * 100) : 0;
  const score = Math.min(100, Math.round(totalFocus * 4 + completion / 2));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Last 30 days · realtime.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Productivity score" value={`${score}`} />
        <Stat label="Total deep work" value={`${totalFocus.toFixed(1)}h`} />
        <Stat label="Tasks completed" value={String(totalDone)} />
        <Stat label="Completion rate" value={`${completion}%`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Deep work · last 14d">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={focusByDay}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} formatter={(v: number) => [`${v}h`, "Focus"]} />
              <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2} fill="url(#fg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tasks created vs done">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tasksByDay}>
              <XAxis dataKey="day" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="created" fill="oklch(var(--accent-raw) / 0.6)" radius={[4,4,0,0]} />
              <Bar dataKey="done" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Time allocation by category">
          {catData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Focus heatmap (by hour)">
          <FocusHeat sessions={recentSessions} />
        </Card>
      </div>
    </div>
  );
}

const tipStyle = { background: "#1B1D21", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 12 };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-elevated p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Empty() { return <div className="grid h-[220px] place-items-center text-sm text-muted-foreground">No data yet</div>; }

function FocusHeat({ sessions }: { sessions: { started_at: string; actual_seconds: number | null }[] }) {
  const grid = Array.from({ length: 24 }, () => 0);
  sessions.forEach((s) => {
    const h = new Date(s.started_at).getHours();
    grid[h] += (s.actual_seconds ?? 0) / 60;
  });
  const max = Math.max(1, ...grid);
  return (
    <div className="grid grid-cols-12 gap-1 pt-3">
      {grid.map((v, h) => {
        const intensity = Math.min(1, v / max);
        return (
          <div key={h} className="flex flex-col items-center gap-1">
            <div className="h-12 w-full rounded-sm transition-all duration-300" style={{ background: `oklch(var(--primary-raw) / ${0.08 + intensity * 0.9})` }} title={`${h}:00 · ${v.toFixed(0)}m`} />
            {h % 3 === 0 && <span className="text-[9px] text-muted-foreground">{h}</span>}
          </div>
        );
      })}
    </div>
  );
}
