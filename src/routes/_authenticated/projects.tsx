import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Github, ExternalLink, Trash2, Award } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectDialog, PROJECT_STAGES as STAGES } from "@/components/project-dialog";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { user } = useAuth();
  const { projects, initialized, fetchProjects, updateProject, deleteProject } = useProjectStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (user && !initialized) {
      fetchProjects(user.id);
    }
  }, [user, initialized, fetchProjects]);

  const handleUpdateStage = async (id: string, stage: string) => {
    try {
      await updateProject(id, { stage });
    } catch {
      toast.error("Failed to update project stage");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      toast.success("Project removed");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const grouped = STAGES.map((s) => ({ stage: s, items: projects.filter((p) => p.stage === s) }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">From idea to deployed.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />New project</Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {grouped.map((g) => (
          <div key={g.stage} className="card-elevated p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.stage}</h3>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{g.items.length}</span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {g.items.map((p) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    key={p.id} 
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug">{p.name}</div>
                        {p.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</div>}
                      </div>
                      <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Select value={p.stage} onValueChange={(v) => handleUpdateStage(p.id, v)}>
                        <SelectTrigger className="h-7 w-auto border-0 bg-surface-2 px-2 text-[10px] uppercase tracking-wide"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="flex items-center gap-1.5">
                        {p.resume_ready && <Award className="h-3.5 w-3.5 text-warning" />}
                        {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><Github className="h-3.5 w-3.5" /></a>}
                        {p.deployment_url && <a href={p.deployment_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {g.items.length === 0 && <div className="rounded-md border border-dashed border-border bg-surface/40 px-2 py-4 text-center text-[11px] text-muted-foreground">Empty</div>}
            </div>
          </div>
        ))}
      </div>

      <ProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}


