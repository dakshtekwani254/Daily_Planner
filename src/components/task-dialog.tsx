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
};

export function TaskDialog({ open, onOpenChange, defaultDate }: Props) {
  const { user } = useAuth();
  const { addTask, tasks } = useTaskStore();
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
  const [recurrenceRule, setRecurrenceRule] = React.useState<string>("");
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(""); setNotes(""); setCategory(allCategories[0] || "");
      setIsCreatingCategory(false);
      setPriority("medium"); setEstimated("");
      setScheduledFor(defaultDate ? toLocalInput(defaultDate) : "");
      setDueDate("");
      setIsRecurring(false);
      setRecurrenceRule("");
    }
  }, [open, defaultDate, allCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    
    setIsPending(true);
    try {
      await addTask({
        title,
        notes: notes || null,
        category,
        priority,
        estimated_minutes: estimated ? Number(estimated) : null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        status: "todo",
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? recurrenceRule : null,
      }, user.id);
      
      toast.success("Task created");
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
          <DialogTitle>New task</DialogTitle>
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
            <div className="space-y-1.5">
              <Label>Recurrence Rule</Label>
              <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREQ=DAILY">Daily</SelectItem>
                  <SelectItem value="FREQ=WEEKLY">Weekly</SelectItem>
                  <SelectItem value="FREQ=MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create task
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
