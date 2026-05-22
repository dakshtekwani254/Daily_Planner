import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Brain, Clock, Code2, Sparkles, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 ring-1 ring-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">Planner OS</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-16 md:pt-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/60 px-3 py-1 text-xs text-muted-foreground animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Built for the next generation of engineers
        </div>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl animate-rise">
          The operating system <br className="hidden md:block" />
          for <span className="gradient-text">elite execution</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground animate-rise" style={{ animationDelay: "60ms" }}>
          A calm, intelligent command center for deep work, LeetCode prep, AI/ML projects and internship execution.
          One workspace. Zero noise.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise" style={{ animationDelay: "120ms" }}>
          <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90">
            Enter the OS <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm text-muted-foreground">
            Press <span className="kbd">⌘</span><span className="kbd">K</span> anywhere
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className="group card-elevated p-5 animate-rise" style={{ animationDelay: `${180 + i * 60}ms` }}>
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const features = [
  { icon: Target, title: "Deep work, by design", desc: "Pomodoro, distraction tracking, focus streaks and ambient fullscreen mode." },
  { icon: Code2, title: "LeetCode tracker", desc: "Topic heatmaps, difficulty splits, revision queues and consistency graphs." },
  { icon: Brain, title: "AI insights", desc: "Smart prioritization, burnout signals and weekly performance reviews." },
  { icon: Clock, title: "Time blocking", desc: "Drag-and-drop hourly planner with recurring tasks and smart reminders." },
  { icon: Zap, title: "Realtime everything", desc: "Tasks, sessions and analytics update instantly across devices." },
  { icon: Sparkles, title: "Command palette", desc: "⌘K-driven navigation. Capture, create and launch without leaving the keyboard." },
];
