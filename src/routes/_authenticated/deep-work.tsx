import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Square, Plus, Minus, Maximize2, X } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/deep-work")({
  component: DeepWorkPage,
});

function DeepWorkPage() {
  const { user } = useAuth();
  const { sessions, initialized, fetchSessions, addSession, updateSession } = useSessionStore();
  const [planned, setPlanned] = React.useState(25);
  const [seconds, setSeconds] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [label, setLabel] = React.useState("Deep work");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [fullscreen, setFullscreen] = React.useState(false);
  const intervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (user && !initialized) {
      fetchSessions(user.id);
    }
  }, [user, initialized, fetchSessions]);

  React.useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          finish(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  React.useEffect(() => { if (!running) setSeconds(planned * 60); }, [planned, running]);

  const start = async () => {
    if (!user) return;
    try {
      const data = await addSession({
        label,
        planned_minutes: planned,
      }, user.id);
      setSessionId(data.id);
      setRunning(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const pause = () => setRunning(false);
  const resume = () => setRunning(true);

  const finish = async (completed: boolean) => {
    setRunning(false);
    const actualSeconds = planned * 60 - seconds;
    if (sessionId) {
      try {
        await updateSession(sessionId, {
          ended_at: new Date().toISOString(),
          actual_seconds: actualSeconds > 0 ? actualSeconds : planned * 60,
          completed,
        });
      } catch (e) {
        toast.error("Failed to complete session");
      }
    }
    setSessionId(null);
    setSeconds(planned * 60);
    if (completed) toast.success("Session complete. Stretch and breathe.");
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / (planned * 60 || 1);

  const todayTotal = sessions
    .filter((s) => new Date(s.started_at) >= startOfDay(new Date()))
    .reduce((a, s) => a + (s.actual_seconds ?? 0), 0);
  const completedCount = sessions.filter((s) => s.completed).length;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <button onClick={() => setFullscreen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
        <div className="my-6 font-mono text-[14vw] font-semibold tabular-nums leading-none gradient-text">{mm}:{ss}</div>
        <div className="flex items-center gap-3">
          {!running ? (
            <Button size="lg" onClick={sessionId ? resume : start}><Play className="mr-2 h-4 w-4" />{sessionId ? "Resume" : "Start"}</Button>
          ) : (
            <Button size="lg" variant="outline" onClick={pause}><Pause className="mr-2 h-4 w-4" />Pause</Button>
          )}
          {sessionId && <Button size="lg" variant="ghost" onClick={() => finish(false)}><Square className="mr-2 h-4 w-4" />End</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deep Work</h1>
        <p className="text-sm text-muted-foreground">Enter flow. One block at a time.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-elevated relative overflow-hidden p-8 lg:col-span-2">
          <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.16_250/0.15),transparent_60%)]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{running ? "In flow" : "Ready"}</div>
            <div className="my-2 font-mono text-7xl font-semibold tabular-nums gradient-text md:text-8xl">{mm}:{ss}</div>
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Button size="icon" variant="outline" disabled={running} onClick={() => setPlanned(Math.max(5, planned - 5))}><Minus className="h-4 w-4" /></Button>
              <span className="w-20 text-center text-sm text-muted-foreground tabular-nums">{planned} min</span>
              <Button size="icon" variant="outline" disabled={running} onClick={() => setPlanned(Math.min(120, planned + 5))}><Plus className="h-4 w-4" /></Button>
            </div>

            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-4 max-w-xs text-center" placeholder="Session label" />

            <div className="mt-6 flex items-center gap-2">
              {!running ? (
                <Button size="lg" onClick={sessionId ? resume : start}><Play className="mr-2 h-4 w-4" />{sessionId ? "Resume" : "Start"}</Button>
              ) : (
                <Button size="lg" variant="outline" onClick={pause}><Pause className="mr-2 h-4 w-4" />Pause</Button>
              )}
              {sessionId && <Button size="lg" variant="ghost" onClick={() => finish(false)}><Square className="mr-2 h-4 w-4" />End</Button>}
              <Button size="lg" variant="ghost" onClick={() => setFullscreen(true)}><Maximize2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>

        <section className="card-elevated p-5">
          <h2 className="mb-3 font-semibold">Today</h2>
          <div className="text-3xl font-semibold tabular-nums">{(todayTotal / 3600).toFixed(1)}h</div>
          <p className="text-xs text-muted-foreground">deep work logged</p>
          <div className="mt-6">
            <div className="text-xs text-muted-foreground">Completed sessions</div>
            <div className="mt-1 text-xl font-semibold">{completedCount}</div>
          </div>
        </section>
      </div>

      <section className="card-elevated mt-6 p-5">
        <h2 className="mb-3 font-semibold">Recent sessions</h2>
        {sessions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            No sessions yet. Start your first block above.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence>
              {sessions.slice(0, 12).map((s) => (
                <motion.li
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={s.id} 
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <span className={`h-2 w-2 rounded-full ${s.completed ? "bg-success" : "bg-muted-foreground"}`} />
                  <span className="flex-1 truncate">{s.label || "Deep work"}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{Math.round((s.actual_seconds ?? 0) / 60)} min</span>
                  <span className="w-32 text-right text-xs text-muted-foreground">{format(new Date(s.started_at), "MMM d, HH:mm")}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
