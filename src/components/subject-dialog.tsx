import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubjectStore } from "@/store/subjectStore";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export function SubjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { subjects, addSubject, deleteSubject } = useSubjectStore();
  const [newSubject, setNewSubject] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;
    
    setIsPending(true);
    try {
      await addSubject(newSubject.trim(), user.id);
      setNewSubject("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add subject");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id);
    } catch (err: any) {
      toast.error("Failed to delete subject");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border-strong bg-popover">
        <DialogHeader><DialogTitle>Manage subjects</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input 
              value={newSubject} 
              onChange={(e) => setNewSubject(e.target.value)} 
              placeholder="New subject name..." 
              required
            />
            <Button type="submit" disabled={isPending || !newSubject.trim()}>Add</Button>
          </form>

          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No custom subjects added.</p>
            ) : (
              subjects.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded border border-border bg-surface px-3 py-2 text-sm">
                  <span>{s.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
