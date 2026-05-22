import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTaskCategoryStore } from "@/store/taskCategoryStore";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export function TaskCategoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { categories, addCategory, deleteCategory } = useTaskCategoryStore();
  const [newCategory, setNewCategory] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim() || !user) return;
    
    setIsPending(true);
    try {
      await addCategory(newCategory.trim(), user.id);
      setNewCategory("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
    } catch (err: any) {
      toast.error("Failed to delete category");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border-strong bg-popover">
        <DialogHeader><DialogTitle>Manage task categories</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)} 
              placeholder="New category name..." 
              required
            />
            <Button type="submit" disabled={isPending || !newCategory.trim()}>Add</Button>
          </form>

          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No custom categories added.</p>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-border bg-surface px-3 py-2 text-sm">
                  <span>{c.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
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
