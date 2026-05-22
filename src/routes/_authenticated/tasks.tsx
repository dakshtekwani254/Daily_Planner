import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTaskStore } from "@/store/taskStore";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MoreHorizontal, Settings2 } from "lucide-react";
import { TaskDialog } from "@/components/task-dialog";
import { TaskCategoryDialog } from "@/components/task-category-dialog";
import { useTaskCategoryStore } from "@/store/taskCategoryStore";
import {
  DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, DragOverlay,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

function TasksPage() {
  const { user } = useAuth();
  const { tasks, initialized: tasksInit, fetchTasks, updateTask, deleteTask } = useTaskStore();
  const { categories, initialized: categoriesInit, fetchCategories } = useTaskCategoryStore();
  const [open, setOpen] = React.useState(false);
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<string>("All");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  React.useEffect(() => {
    if (user && !tasksInit) fetchTasks(user.id);
    if (user && !categoriesInit) fetchCategories(user.id);
  }, [user, tasksInit, categoriesInit, fetchTasks, fetchCategories]);

  const allCategories = React.useMemo(() => {
    const cats = new Set([...categories.map(c => c.name)]);
    tasks.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, [tasks, categories]);

  const filtered = tasks.filter((t) => filter === "All" || t.category === filter);
  const grouped = COLUMNS.map((c) => ({ ...c, items: filtered.filter((t) => t.status === c.id) }));
  const activeTask = activeId ? filtered.find((t) => t.id === activeId) : null;

  const onEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const targetStatus = String(e.over.id);
    if (!["todo", "in_progress", "done"].includes(targetStatus)) return;
    const id = String(e.active.id);
    const task = filtered.find((t) => t.id === id);
    if (task && task.status !== targetStatus) {
      try {
        await updateTask(id, { 
          status: targetStatus, 
          completed_at: targetStatus === "done" ? new Date().toISOString() : null 
        });
      } catch (err) {
        toast.error("Failed to move task");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Organize, prioritize, ship.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface p-1">
            {(["All", ...allCategories] as const).map((c) => (
              <button key={c} onClick={() => setFilter(c)}
                className={`rounded px-2 py-1 text-xs transition-colors ${filter === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCategoriesOpen(true)}>
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />New task</Button>
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {grouped.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} count={col.items.length}>
              <AnimatePresence>
                {col.items.map((t) => (
                  <KanbanCard key={t.id} task={t} onDelete={() => handleDelete(t.id)} />
                ))}
              </AnimatePresence>
              {col.items.length === 0 && (
                <div className="rounded-md border border-dashed border-border bg-surface/40 px-3 py-6 text-center text-xs text-muted-foreground">
                  Drop tasks here
                </div>
              )}
            </Column>
          ))}
        </div>
        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} onDelete={() => {}} dragging />}
        </DragOverlay>
      </DndContext>

      <TaskDialog open={open} onOpenChange={setOpen} />
      <TaskCategoryDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}

function Column({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`card-elevated p-3 transition-colors ${isOver ? "ring-1 ring-primary/40" : ""}`}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KanbanCard({ task, onDelete, dragging }: { task: any; onDelete: () => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`group cursor-grab rounded-lg border border-border bg-surface p-3 transition-all hover:border-border-strong hover:bg-surface-2 active:cursor-grabbing ${dragging ? "shadow-2xl ring-1 ring-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</div>
          {task.notes && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.notes}</div>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border-strong bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{task.category}</span>
        <PriorityBadge p={task.priority} />
        {task.scheduled_for && (
          <span className="text-[10px] text-muted-foreground">{format(new Date(task.scheduled_for), "MMM d, HH:mm")}</span>
        )}
      </div>
    </motion.div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    urgent: "bg-destructive/15 text-destructive ring-destructive/30",
    high: "bg-warning/15 text-warning ring-warning/30",
    medium: "bg-primary/15 text-primary ring-primary/30",
    low: "bg-muted text-muted-foreground ring-border",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ring-1 ${map[p] ?? map.medium}`}>{p}</span>;
}
