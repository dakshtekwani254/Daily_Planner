import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProjectStore } from "@/store/projectStore";
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
import { Loader2 } from "lucide-react";

export const PROJECT_STAGES = ["Idea", "Planning", "Development", "Testing", "Deployment", "Completed"] as const;

export function ProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { addProject } = useProjectStore();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [stage, setStage] = React.useState<string>("Idea");
  const [github, setGithub] = React.useState("");
  const [deploy, setDeploy] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [resumeReady, setResumeReady] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => { 
    if (open) { 
      setName(""); setDescription(""); setStage("Idea"); setGithub(""); setDeploy(""); setProgress(0); setResumeReady(false); 
    } 
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    
    setIsPending(true);
    try {
      await addProject({
        name,
        description: description || null,
        stage,
        github_url: github || null,
        deployment_url: deploy || null,
        progress,
        resume_ready: resumeReady,
      }, user.id);
      toast.success("Project created");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border-strong bg-popover">
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Progress %</Label><Input type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1.5"><Label>GitHub URL</Label><Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" /></div>
          <div className="space-y-1.5"><Label>Deployment URL</Label><Input value={deploy} onChange={(e) => setDeploy(e.target.value)} placeholder="https://…" /></div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="resume_ready" checked={resumeReady} onCheckedChange={(c) => setResumeReady(!!c)} />
            <Label htmlFor="resume_ready" className="font-normal text-sm">Resume Ready</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
