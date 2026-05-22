import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTaskStore } from "@/store/taskStore";
import { useTaskCategoryStore } from "@/store/taskCategoryStore";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, X } from "lucide-react";

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: Date;
  editTask?: any;
};

export function TaskDialog({ open, onOpenChange, defaultDate, editTask }: Props) {
  const { user } = useAuth();
  const { addTask, updateTask, tasks } = useTaskStore();
  const { categories: customCategories } = useTaskCategoryStore();
  
  const allCategories = React.useMemo(() => {
    const cats = new Set([...customCategories.map(c => c.name)]);
    tasks.forEach(t => cats.add(t.category));
    return Array.from(cats).filter(c => c && c.trim() !== "");
  }, [tasks, customCategories]);

  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [category, setCategory] = React.useState<string>("");
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [priority, setPriority] = React.useState<string>("medium");
  const [estimated, setEstimated] = React.useState<string>("");
  const [scheduledFor, setScheduledFor] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [isPending, setIsPending] = React.useState(false);

  const DAYS = [
    { value: "SU", label: "S" },
    { value: "MO", label: "M" },
    { value: "TU", label: "T" },
    { value: "WE", label: "W" },
    { value: "TH", label: "T" },
    { value: "FR", label: "F" },
    { value: "SA", label: "S" },
  ];

  React.useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title || "");
        setNotes(editTask.notes || "");
        setCategory(editTask.category || allCategories[0] || "");
        setIsCreatingCategory(false);
        setPriority(editTask.priority || "medium");
        setEstimated(editTask.estimated_minutes ? String(editTask.estimated_minutes) : "");
        setScheduledFor(editTask.scheduled_for ? toLocalInput(new Date(editTask.scheduled_for)) : "");
        setDueDate(editTask.due_date ? toLocalInput(new Date(editTask.due_date)) : "");
        setIsRecurring(editTask.is_recurring || false);
        if (editTask.recurrence_rule?.includes("BYDAY=")) {
          const daysStr = editTask.recurrence_rule.split("BYDAY=")[1].split(";")[0];
          setSelectedDays(daysStr.split(","));
        } else {
          setSelectedDays([]);
        }
      } else {
        setTitle(""); setNotes(""); setCategory(allCategories[0] || "");
        setIsCreatingCategory(false);
        setPriority("medium"); setEstimated("");
        
        // Default to current time if no defaultDate is provided so it appears in Daily Planner
        const now = new Date();
        now.setMinutes(0, 0, 0);
        setScheduledFor(defaultDate ? toLocalInput(defaultDate) : toLocalInput(now));
        
        setDueDate("");
        setIsRecurring(false);
        setSelectedDays([]);
      }
    }
  }, [open, defaultDate, allCategories, editTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user || (isRecurring && selectedDays.length === 0)) return;
    
    setIsPending(true);
    try {
      const taskData = {
        title,
        notes: notes || null,
        category,
        priority,
        estimated_minutes: estimated ? Number(estimated) : null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        is_recurring: isRecurring && selectedDays.length > 0,
        recurrence_rule: isRecurring && selectedDays.length > 0 ? `FREQ=WEEKLY;BYDAY=${selectedDays.join(",")}` : null,
      };

      if (editTask) {
        await updateTask(editTask.id, taskData);
        toast.success("Task updated");
      } else {
        await addTask({ ...taskData, status: "todo" }, user.id);
        toast.success("Task created");
      }
      
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border-strong bg-popover">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title" autoFocus value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              {isCreatingCategory ? (
                <div className="flex gap-2">
                  <Input 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    placeholder="New category..." 
                    autoFocus 
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => {
                    setIsCreatingCategory(false);
                    setCategory(allCategories[0] || "");
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select value={category || undefined} onValueChange={(v) => {
                  if (v === "__create_new__") {
                    setCategory("");
                    setIsCreatingCategory(true);
                  } else {
                    setCategory(v);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__create_new__" className="text-primary font-medium">+ New category</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sched">Scheduled for</Label>
              <Input id="sched" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="est">Estimated (minutes)</Label>
            <Input id="est" type="number" min="0" value={estimated} onChange={(e) => setEstimated(e.target.value)} placeholder="e.g. 45" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(c) => setIsRecurring(!!c)} />
            <Label htmlFor="recurring" className="font-normal text-sm">Make this task recurring</Label>
          </div>
          {isRecurring && (
            <div className="space-y-2">
              <Label>Repeat on</Label>
              <div className="flex justify-between gap-1">
                {DAYS.map((d) => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        setSelectedDays(prev => 
                          isSelected ? prev.filter(v => v !== d.value) : [...prev, d.value]
                        );
                      }}
                      className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim() || (isRecurring && selectedDays.length === 0)}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTask ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}
