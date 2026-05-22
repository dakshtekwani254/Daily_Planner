import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLearningStore } from "@/store/learningStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const SUBJECTS = ["Computer Networks", "DSA", "Mathematics", "Data Science", "AI/ML"] as const;

export function LearningModuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { addModule } = useLearningStore();
  const [subject, setSubject] = React.useState<string>(SUBJECTS[0]);
  const [name, setName] = React.useState("");
  const [total, setTotal] = React.useState(10);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => { if (open) { setName(""); setTotal(10); setSubject(SUBJECTS[0]); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    
    setIsPending(true);
    try {
      await addModule({
        subject,
        module_name: name,
        total_items: total,
      }, user.id);
      toast.success("Module added");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add module");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border-strong bg-popover">
        <DialogHeader><DialogTitle>Add learning module</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Module name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
          <div className="space-y-1.5"><Label>Total items</Label><Input type="number" min="1" value={total} onChange={(e) => setTotal(Number(e.target.value))} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
