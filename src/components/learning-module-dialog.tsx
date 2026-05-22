import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLearningStore } from "@/store/learningStore";
import { useSubjectStore } from "@/store/subjectStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LearningModuleDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { modules, addModule } = useLearningStore();
  const { subjects: customSubjects } = useSubjectStore();
  
  const existingSubjects = React.useMemo(() => {
    const subs = new Set([...customSubjects.map(s => s.name)]);
    modules.forEach((m) => subs.add(m.subject));
    return Array.from(subs);
  }, [modules, customSubjects]);
  
  const [subject, setSubject] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [total, setTotal] = React.useState<number | "">(10);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSubject(existingSubjects[0] || "");
      setName("");
      setTotal("");
    }
  }, [open, existingSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user || !subject) return;
    
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
            <Input list="subjects-list" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Select or type new subject" />
            <datalist id="subjects-list">
              {existingSubjects.map((s) => <option key={s} value={s} />)}
            </datalist>
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
