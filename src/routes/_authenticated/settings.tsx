import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Keyboard, Bell, User, Palette, Check, X, Edit2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();

  const [isEditing, setIsEditing] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(user?.user_metadata?.full_name || "");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nameInput.trim() }
      });
      if (error) throw error;
      
      // Update profile table as well to keep it in sync
      if (user?.id) {
        await supabase.from('profiles').update({ display_name: nameInput.trim() }).eq('id', user.id);
      }
      
      toast.success("Name updated successfully");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your operating system.</p>
      </header>

      <div className="space-y-4">
        <Section icon={User} title="Account">
          <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
            <span className="text-sm text-muted-foreground w-20">Name</span>
            {isEditing ? (
              <div className="flex flex-1 items-center gap-2">
                <Input 
                  className="h-8 text-sm" 
                  value={nameInput} 
                  onChange={(e) => setNameInput(e.target.value)} 
                  autoFocus 
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={handleSaveName} disabled={isSaving || !nameInput.trim()}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-between">
                <span className="text-sm">{user?.user_metadata?.full_name || "—"}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setNameInput(user?.user_metadata?.full_name || ""); setIsEditing(true); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
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
          <Kbd combo="Ctrl K" label="Open command palette" />
          <Kbd combo="Ctrl N" label="New task" />
          <Kbd combo="Ctrl /" label="Toggle sidebar" />
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
