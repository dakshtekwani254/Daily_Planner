import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Module = Database['public']['Tables']['learning_modules']['Row'];

interface LearningState {
  modules: Module[];
  loading: boolean;
  initialized: boolean;
  fetchModules: (userId: string) => Promise<void>;
  addModule: (module: Omit<Module, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'progress' | 'completed_items'>, userId: string) => Promise<void>;
  updateModule: (id: string, updates: Partial<Module>) => Promise<void>;
  deleteModule: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  modules: [],
  loading: false,
  initialized: false,
  
  fetchModules: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('learning_modules')
      .select('*')
      .eq('user_id', userId)
      .order('subject')
      .order('created_at');
      
    if (!error && data) {
      set({ modules: data, initialized: true });
    }
    set({ loading: false });
  },

  addModule: async (module, userId) => {
    const tempId = `temp-${Date.now()}`;
    const newModule: Module = {
      ...module,
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_items: 0,
      progress: 0,
      notes: module.notes ?? null,
    };
    
    set((state) => ({ modules: [...state.modules, newModule] }));

    const { data, error } = await supabase
      .from('learning_modules')
      .insert({ ...module, user_id: userId, completed_items: 0, progress: 0 })
      .select()
      .single();

    if (error) {
      set((state) => ({ modules: state.modules.filter((m) => m.id !== tempId) }));
      throw error;
    } else {
      set((state) => ({
        modules: state.modules.map((m) => (m.id === tempId ? data : m)),
      }));
    }
  },

  updateModule: async (id, updates) => {
    const prevModules = get().modules;
    let nextModules = prevModules.map((m) => {
      if (m.id !== id) return m;
      const nextM = { ...m, ...updates, updated_at: new Date().toISOString() };
      if (nextM.total_items > 0) {
         nextM.progress = Math.round((nextM.completed_items / nextM.total_items) * 100);
      } else {
         nextM.progress = 0;
      }
      return nextM;
    });

    set({ modules: nextModules });

    const targetModule = nextModules.find(m => m.id === id);
    if (!targetModule) return;

    const { error } = await supabase
      .from('learning_modules')
      .update({
        completed_items: targetModule.completed_items,
        total_items: targetModule.total_items,
        progress: targetModule.progress,
      })
      .eq('id', id);

    if (error) {
      set({ modules: prevModules });
      throw error;
    }
  },

  deleteModule: async (id) => {
    const prevModules = get().modules;
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== id),
    }));

    const { error } = await supabase
      .from('learning_modules')
      .delete()
      .eq('id', id);

    if (error) {
      set({ modules: prevModules });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextModules = [...state.modules];
      
      if (eventType === 'INSERT') {
        if (!nextModules.find(m => m.id === newRecord.id)) {
          nextModules.push(newRecord as Module);
        }
      } else if (eventType === 'UPDATE') {
        nextModules = nextModules.map(m => m.id === newRecord.id ? (newRecord as Module) : m);
      } else if (eventType === 'DELETE') {
        nextModules = nextModules.filter(m => m.id !== oldRecord.id);
      }
      
      // Keep sorted by subject, then created_at
      nextModules.sort((a, b) => {
        if (a.subject < b.subject) return -1;
        if (a.subject > b.subject) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      return { modules: nextModules };
    });
  }
}));
