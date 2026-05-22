import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLeetcodeStore } from "@/store/leetcodeStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const TOPICS = ["Arrays", "Strings", "Trees", "Graphs", "DP", "Binary Search", "Greedy", "Recursion", "Backtracking"];
export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export function AddEntryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { addEntry } = useLeetcodeStore();
  const [name, setName] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<string>("Medium");
  const [topic, setTopic] = React.useState<string>("Arrays");
  const [url, setUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => { if (open) { setName(""); setUrl(""); setNotes(""); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    
    setIsPending(true);
    try {
      await addEntry({
        problem_name: name,
        difficulty,
        topic,
        url: url || null,
        notes: notes || null,
        solved_at: new Date().toISOString().split('T')[0]
      }, user.id);
      toast.success("Problem logged");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to log problem");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border-strong bg-popover">
        <DialogHeader><DialogTitle>Log solved problem</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Problem name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL (optional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://leetcode.com/..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
