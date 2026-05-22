import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Note = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];

interface NotesState {
  notes: Note[];
  loading: boolean;
  initialized: boolean;
  fetchNotes: (userId: string) => Promise<void>;
  addNote: (note: Omit<NoteInsert, 'user_id'>, userId: string) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  initialized: false,
  
  fetchNotes: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
      
    if (!error && data) {
      set({ notes: data, initialized: true });
    }
    set({ loading: false });
  },

  addNote: async (note, userId) => {
    const tempId = `temp-${Date.now()}`;
    const newNote: Note = {
      id: tempId,
      user_id: userId,
      title: note.title ?? 'Untitled',
      content: note.content ?? null,
      tags: note.tags ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    set((state) => ({ notes: [newNote, ...state.notes] }));

    const { data, error } = await supabase
      .from('notes')
      .insert({ ...note, user_id: userId })
      .select()
      .single();

    if (error) {
      set((state) => ({ notes: state.notes.filter((n) => n.id !== tempId) }));
      throw error;
    } else {
      set((state) => ({
        notes: state.notes.map((n) => (n.id === tempId ? data : n)),
      }));
      return data;
    }
  },

  updateNote: async (id, updates) => {
    const prevNotes = get().notes;
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)),
    }));

    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id);

    if (error) {
      set({ notes: prevNotes });
      throw error;
    }
  },

  deleteNote: async (id) => {
    const prevNotes = get().notes;
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      set({ notes: prevNotes });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextNotes = [...state.notes];
      
      if (eventType === 'INSERT') {
        if (!nextNotes.find(n => n.id === newRecord.id)) {
          nextNotes.unshift(newRecord as Note);
        }
      } else if (eventType === 'UPDATE') {
        nextNotes = nextNotes.map(n => n.id === newRecord.id ? (newRecord as Note) : n);
      } else if (eventType === 'DELETE') {
        nextNotes = nextNotes.filter(n => n.id !== oldRecord.id);
      }
      
      nextNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { notes: nextNotes };
    });
  }
}));
