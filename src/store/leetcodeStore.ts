import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type LeetCodeEntry = Database['public']['Tables']['leetcode_entries']['Row'];
type LeetCodeInsert = Database['public']['Tables']['leetcode_entries']['Insert'];

interface LeetcodeState {
  entries: LeetCodeEntry[];
  loading: boolean;
  initialized: boolean;
  fetchEntries: (userId: string) => Promise<void>;
  addEntry: (entry: Omit<LeetCodeInsert, 'user_id'>, userId: string) => Promise<void>;
  updateEntry: (id: string, updates: Partial<LeetCodeEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useLeetcodeStore = create<LeetcodeState>((set, get) => ({
  entries: [],
  loading: false,
  initialized: false,
  
  fetchEntries: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('leetcode_entries')
      .select('*')
      .eq('user_id', userId)
      .order('solved_at', { ascending: false });
      
    if (!error && data) {
      set({ entries: data, initialized: true });
    }
    set({ loading: false });
  },

  addEntry: async (entry, userId) => {
    const { data, error } = await supabase
      .from('leetcode_entries')
      .insert({
        ...entry,
        user_id: userId,
        difficulty: entry.difficulty ?? 'Medium',
        topic: entry.topic ?? 'Arrays',
        needs_revision: entry.needs_revision ?? false
      })
      .select()
      .single();

    if (error) {
      throw error;
    } else {
      set((state) => {
        if (state.entries.find((e) => e.id === data.id)) return state;
        return { entries: [data, ...state.entries] };
      });
    }
  },

  updateEntry: async (id, updates) => {
    const prevEntries = get().entries;
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));

    const { error } = await supabase
      .from('leetcode_entries')
      .update(updates)
      .eq('id', id);

    if (error) {
      set({ entries: prevEntries });
      throw error;
    }
  },

  deleteEntry: async (id) => {
    const prevEntries = get().entries;
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    }));

    const { error } = await supabase
      .from('leetcode_entries')
      .delete()
      .eq('id', id);

    if (error) {
      set({ entries: prevEntries });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextEntries = [...state.entries];
      
      if (eventType === 'INSERT') {
        if (!nextEntries.find(e => e.id === newRecord.id)) {
          nextEntries.unshift(newRecord as LeetCodeEntry);
        }
      } else if (eventType === 'UPDATE') {
        nextEntries = nextEntries.map(e => e.id === newRecord.id ? (newRecord as LeetCodeEntry) : e);
      } else if (eventType === 'DELETE') {
        nextEntries = nextEntries.filter(e => e.id !== oldRecord.id);
      }
      
      nextEntries.sort((a, b) => new Date(b.solved_at).getTime() - new Date(a.solved_at).getTime());
      return { entries: nextEntries };
    });
  }
}));
