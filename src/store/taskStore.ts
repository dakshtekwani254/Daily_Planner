import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

interface TaskState {
  tasks: Task[];
  loading: boolean;
  initialized: boolean;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (task: Omit<TaskInsert, 'user_id'>, userId: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  initialized: false,
  
  fetchTasks: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      set({ tasks: data, initialized: true });
    }
    set({ loading: false });
  },

  addTask: async (task, userId) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      user_id: userId,
      title: task.title,
      notes: task.notes ?? null,
      category: task.category ?? 'Personal',
      status: task.status ?? 'todo',
      priority: task.priority ?? 'medium',
      due_date: task.due_date ?? null,
      scheduled_for: task.scheduled_for ?? null,
      estimated_minutes: task.estimated_minutes ?? null,
      actual_minutes: task.actual_minutes ?? 0,
      tags: task.tags ?? [],
      completed_at: task.completed_at ?? null,
      position: task.position ?? 0,
      is_recurring: task.is_recurring ?? false,
      recurrence_rule: task.recurrence_rule ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    set((state) => ({ tasks: [newTask, ...state.tasks] }));

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...task, user_id: userId })
      .select()
      .single();

    if (error) {
      // Revert optimistic update
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
      throw error;
    } else {
      // Replace temp with real
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === tempId ? data : t)),
      }));
    }
  },

  updateTask: async (id, updates) => {
    const prevTasks = get().tasks;
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      // Revert
      set({ tasks: prevTasks });
      throw error;
    }
  },

  deleteTask: async (id) => {
    const prevTasks = get().tasks;
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      // Revert
      set({ tasks: prevTasks });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextTasks = [...state.tasks];
      
      if (eventType === 'INSERT') {
        if (!nextTasks.find(t => t.id === newRecord.id)) {
          nextTasks.unshift(newRecord as Task);
        }
      } else if (eventType === 'UPDATE') {
        nextTasks = nextTasks.map(t => t.id === newRecord.id ? (newRecord as Task) : t);
      } else if (eventType === 'DELETE') {
        nextTasks = nextTasks.filter(t => t.id !== oldRecord.id);
      }
      
      // Keep sorted
      nextTasks.sort((a, b) => {
        if (a.position !== b.position) return (a.position ?? 0) - (b.position ?? 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      return { tasks: nextTasks };
    });
  }
}));
