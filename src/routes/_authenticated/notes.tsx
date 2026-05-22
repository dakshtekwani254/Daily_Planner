import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotesStore } from "@/store/notesStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/notes")({
  component: NotesPage,
});

function NotesPage() {
  const { user } = useAuth();
  const { notes, initialized, fetchNotes, addNote, updateNote, deleteNote } = useNotesStore();
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [editTitle, setEditTitle] = React.useState("");
  const [editContent, setEditContent] = React.useState("");
  const [editTags, setEditTags] = React.useState("");
  
  React.useEffect(() => {
    if (user && !initialized) {
      fetchNotes(user.id);
    }
  }, [user, initialized, fetchNotes]);

  const filteredNotes = notes.filter((n) => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    (n.content && n.content.toLowerCase().includes(search.toLowerCase())) ||
    (n.tags && n.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  const selectedNote = notes.find((n) => n.id === selectedId);

  const previousSelectedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (selectedNote && selectedId !== previousSelectedId.current) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content || "");
      setEditTags((selectedNote.tags || []).join(", "));
      previousSelectedId.current = selectedId;
    } else if (!selectedNote) {
      setEditTitle("");
      setEditContent("");
      setEditTags("");
      previousSelectedId.current = null;
    }
  }, [selectedId, selectedNote]);

  // Debounced Autosave
  React.useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => {
      // Avoid saving if unchanged (basic check)
      if (selectedNote && 
          selectedNote.title === editTitle && 
          (selectedNote.content || "") === editContent && 
          (selectedNote.tags || []).join(", ") === editTags) {
        return;
      }
      
      const tagsArray = editTags.split(",").map(t => t.trim()).filter(Boolean);
      updateNote(selectedId, {
        title: editTitle,
        content: editContent,
        tags: tagsArray,
        updated_at: new Date().toISOString()
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [editTitle, editContent, editTags, selectedId, selectedNote, updateNote]);

  const handleCreate = async () => {
    if (!user) return;
    try {
      const newNote = await addNote({
        title: "Untitled Note",
        content: "",
        tags: [],
      }, user.id);
      setSelectedId(newNote.id);
    } catch (e) {
      toast.error("Failed to create note");
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      const tagsArray = editTags.split(",").map(t => t.trim()).filter(Boolean);
      await updateNote(selectedId, {
        title: editTitle,
        content: editContent,
        tags: tagsArray,
        updated_at: new Date().toISOString()
      });
      toast.success("Saved");
    } catch (e) {
      toast.error("Failed to save note");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteNote(id);
      if (selectedId === id) setSelectedId(null);
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-surface/30">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
          <Button size="icon" variant="ghost" onClick={handleCreate}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 bg-surface border-border-strong"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <AnimatePresence>
            {filteredNotes.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4">No notes found.</div>
            ) : (
              filteredNotes.map((n) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`group relative flex cursor-pointer flex-col gap-1 rounded-md p-3 transition-colors ${selectedId === n.id ? "bg-primary/10 border-primary/20 border" : "hover:bg-surface border border-transparent"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate pr-4">{n.title || "Untitled"}</span>
                    <button 
                      onClick={(e) => handleDelete(n.id, e)} 
                      className="absolute right-2 top-3 hidden text-muted-foreground hover:text-destructive group-hover:block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{n.content || "Empty note"}</span>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1 overflow-hidden">
                      {(n.tags || []).slice(0, 2).map(t => (
                        <span key={t} className="rounded-sm bg-surface-2 px-1 py-0.5 text-[10px] text-muted-foreground truncate">{t}</span>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(n.updated_at), "MMM d")}</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col bg-background">
        {selectedId ? (
          <>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2 flex-1">
                <Input 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  className="border-transparent bg-transparent text-xl font-semibold shadow-none focus-visible:ring-0 px-0 h-auto"
                  placeholder="Note title"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-2">
                  Last updated {format(new Date(selectedNote?.updated_at || Date.now()), "HH:mm")}
                </span>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
            <div className="p-4 border-b border-border bg-surface/30 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Tags:</span>
              <Input 
                value={editTags} 
                onChange={(e) => setEditTags(e.target.value)} 
                className="h-8 text-sm border-transparent bg-transparent shadow-none focus-visible:ring-0 flex-1 px-0"
                placeholder="Comma separated tags (e.g. ideas, work)"
              />
            </div>
            <div className="flex-1 p-4">
              <Textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                className="h-full min-h-full resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
                placeholder="Start typing your note..."
              />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <FileText className="mb-4 h-12 w-12 opacity-20" />
            <p>Select a note or create a new one</p>
            <Button variant="outline" className="mt-4" onClick={handleCreate}>Create Note</Button>
          </div>
        )}
      </div>
    </div>
  );
}
