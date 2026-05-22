import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLearningStore } from "@/store/learningStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LearningModuleDialog, SUBJECTS } from "@/components/learning-module-dialog";

export const Route = createFileRoute("/_authenticated/learning")({
  component: LearningPage,
});

function LearningPage() {
  const { user } = useAuth();
  const { modules, initialized, fetchModules, updateModule, deleteModule } = useLearningStore();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (user && !initialized) {
      fetchModules(user.id);
    }
  }, [user, initialized, fetchModules]);

  const handleUpdate = async (id: string, completed_items: number, total_items: number) => {
    try {
      await updateModule(id, { completed_items, total_items });
    } catch {
      toast.error("Failed to update module progress");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteModule(id);
      toast.success("Module removed");
    } catch {
      toast.error("Failed to remove module");
    }
  };

  const bySubject = SUBJECTS.map((s) => ({
    subject: s,
    items: modules.filter((m) => m.subject === s),
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning</h1>
          <p className="text-sm text-muted-foreground">Track mastery across your subjects.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Add module</Button>
      </header>

      <div className="space-y-6">
        {bySubject.map((s) => (
          <section key={s.subject} className="card-elevated p-5">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{s.subject}</h2>
              <span className="text-xs text-muted-foreground">· {s.items.length} modules</span>
            </div>
            {s.items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-surface/40 px-4 py-4 text-center text-xs text-muted-foreground">No modules yet</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <AnimatePresence>
                  {s.items.map((m) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      key={m.id} 
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{m.module_name}</div>
                        <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${m.progress}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{m.completed_items} / {m.total_items} items</span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdate(m.id, Math.max(0, m.completed_items - 1), m.total_items)}>−</Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleUpdate(m.id, Math.min(m.total_items, m.completed_items + 1), m.total_items)}>+</Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        ))}
      </div>

      <LearningModuleDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}


