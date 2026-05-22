import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Subject = Database['public']['Tables']['subjects']['Row'];
type SubjectInsert = Database['public']['Tables']['subjects']['Insert'];

interface SubjectState {
  subjects: Subject[];
  loading: boolean;
  initialized: boolean;
  fetchSubjects: (userId: string) => Promise<void>;
  addSubject: (name: string, userId: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  loading: false,
  initialized: false,
  
  fetchSubjects: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      set({ subjects: data, initialized: true });
    }
    set({ loading: false });
  },

  addSubject: async (name, userId) => {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ name, user_id: userId })
      .select()
      .single();

    if (error) {
      throw error;
    } else {
      set((state) => {
        if (state.subjects.find((s) => s.id === data.id)) return state;
        return { subjects: [...state.subjects, data] };
      });
    }
  },

  deleteSubject: async (id) => {
    const prevSubjects = get().subjects;
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
    }));

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      set({ subjects: prevSubjects });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextSubjects = [...state.subjects];
      
      if (eventType === 'INSERT') {
        if (!nextSubjects.find(s => s.id === newRecord.id)) {
          nextSubjects.push(newRecord as Subject);
        }
      } else if (eventType === 'DELETE') {
        nextSubjects = nextSubjects.filter(s => s.id !== oldRecord.id);
      }
      
      nextSubjects.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { subjects: nextSubjects };
    });
  }
}));
