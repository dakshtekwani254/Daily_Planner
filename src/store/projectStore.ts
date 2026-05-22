import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

interface ProjectState {
  projects: Project[];
  loading: boolean;
  initialized: boolean;
  fetchProjects: (userId: string) => Promise<void>;
  addProject: (project: Omit<ProjectInsert, 'user_id'>, userId: string) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  initialized: false,
  
  fetchProjects: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      set({ projects: data, initialized: true });
    }
    set({ loading: false });
  },

  addProject: async (project, userId) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        user_id: userId,
        progress: project.progress ?? 0,
        resume_ready: project.resume_ready ?? false,
        stage: project.stage ?? 'Idea',
        position: project.position ?? 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    } else {
      set((state) => {
        if (state.projects.find((p) => p.id === data.id)) return state;
        return { projects: [data, ...state.projects] };
      });
    }
  },

  updateProject: async (id, updates) => {
    const prevProjects = get().projects;
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (error) {
      set({ projects: prevProjects });
      throw error;
    }
  },

  deleteProject: async (id) => {
    const prevProjects = get().projects;
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      set({ projects: prevProjects });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextProjects = [...state.projects];
      
      if (eventType === 'INSERT') {
        if (!nextProjects.find(p => p.id === newRecord.id)) {
          nextProjects.unshift(newRecord as Project);
        }
      } else if (eventType === 'UPDATE') {
        nextProjects = nextProjects.map(p => p.id === newRecord.id ? (newRecord as Project) : p);
      } else if (eventType === 'DELETE') {
        nextProjects = nextProjects.filter(p => p.id !== oldRecord.id);
      }
      
      nextProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { projects: nextProjects };
    });
  }
}));
