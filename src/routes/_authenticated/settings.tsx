import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Keyboard, Bell, User, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your operating system.</p>
      </header>

      <div className="space-y-4">
        <Section icon={User} title="Account">
          <Row label="Name" value={user?.user_metadata?.full_name || "—"} />
          <Row label="Email" value={user?.email || "—"} />
          <Row label="User ID" value={<span className="font-mono text-xs">{user?.id}</span>} />
          <div className="pt-3">
            <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </Section>

        <Section icon={Palette} title="Appearance">
          <Row label="Theme" value="Dark · Midnight" />
          <Row label="Accent" value={<span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-primary" /> Electric blue</span>} />
        </Section>

        <Section icon={Keyboard} title="Keyboard shortcuts">
          <Kbd combo="⌘ K" label="Open command palette" />
          <Kbd combo="N" label="New task (via palette)" />
          <Kbd combo="⌘ /" label="Toggle sidebar" />
        </Section>

        <Section icon={Bell} title="Focus & notifications">
          <Row label="Default session length" value="25 minutes" />
          <Row label="Browser notifications" value="Off" />
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="card-elevated p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function Kbd({ combo, label }: { combo: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {combo.split(" ").map((k) => <span key={k} className="kbd">{k}</span>)}
      </div>
    </div>
  );
}
