import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TaskCategory = Database['public']['Tables']['task_categories']['Row'];

interface TaskCategoryState {
  categories: TaskCategory[];
  loading: boolean;
  initialized: boolean;
  fetchCategories: (userId: string) => Promise<void>;
  addCategory: (name: string, userId: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useTaskCategoryStore = create<TaskCategoryState>((set, get) => ({
  categories: [],
  loading: false,
  initialized: false,
  
  fetchCategories: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
      
    if (!error && data) {
      set({ categories: data, initialized: true });
    }
    set({ loading: false });
  },

  addCategory: async (name, userId) => {
    const { data, error } = await supabase
      .from('task_categories')
      .insert({ name, user_id: userId })
      .select()
      .single();

    if (error) {
      throw error;
    } else {
      set((state) => {
        if (state.categories.find((c) => c.id === data.id)) return state;
        return { categories: [...state.categories, data] };
      });
    }
  },

  deleteCategory: async (id) => {
    const prevCategories = get().categories;
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));

    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', id);

    if (error) {
      set({ categories: prevCategories });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextCategories = [...state.categories];
      
      if (eventType === 'INSERT') {
        if (!nextCategories.find(c => c.id === newRecord.id)) {
          nextCategories.push(newRecord as TaskCategory);
        }
      } else if (eventType === 'DELETE') {
        nextCategories = nextCategories.filter(c => c.id !== oldRecord.id);
      }
      
      nextCategories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { categories: nextCategories };
    });
  }
}));
