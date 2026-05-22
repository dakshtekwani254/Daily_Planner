import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { addDays, addWeeks, addMonths } from 'date-fns';

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
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        user_id: userId,
        is_recurring: task.is_recurring ?? false,
        actual_minutes: task.actual_minutes ?? 0,
        position: task.position ?? 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    } else {
      set((state) => {
        // Prevent duplication if realtime already inserted it
        if (state.tasks.find((t) => t.id === data.id)) return state;
        return { tasks: [data, ...state.tasks] };
      });
    }
  },

  updateTask: async (id, updates) => {
    const prevTasks = get().tasks;
    const task = prevTasks.find(t => t.id === id);
    if (!task) return;

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      set({ tasks: prevTasks });
      throw error;
    }

    // Recurring logic
    if (updates.status === 'done' && task.status !== 'done' && task.is_recurring && task.recurrence_rule) {
      let nextScheduled = task.scheduled_for ? new Date(task.scheduled_for) : null;
      let nextDue = task.due_date ? new Date(task.due_date) : null;

      if (task.recurrence_rule?.includes('BYDAY=')) {
        const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
        const byDayStr = task.recurrence_rule.split("BYDAY=")[1].split(";")[0].split(",");
        let limit = 7;
        while(limit > 0) {
          if (nextScheduled) nextScheduled = addDays(nextScheduled, 1);
          if (nextDue) nextDue = addDays(nextDue, 1);
          
          const checkDate = nextScheduled || nextDue || addDays(new Date(), 1);
          if (byDayStr.includes(daysMap[checkDate.getDay()])) {
            break;
          }
          limit--;
        }
      } else if (task.recurrence_rule === 'FREQ=DAILY') {
        if (nextScheduled) nextScheduled = addDays(nextScheduled, 1);
        if (nextDue) nextDue = addDays(nextDue, 1);
      } else if (task.recurrence_rule === 'FREQ=WEEKLY') {
        if (nextScheduled) nextScheduled = addWeeks(nextScheduled, 1);
        if (nextDue) nextDue = addWeeks(nextDue, 1);
      } else if (task.recurrence_rule === 'FREQ=MONTHLY') {
        if (nextScheduled) nextScheduled = addMonths(nextScheduled, 1);
        if (nextDue) nextDue = addMonths(nextDue, 1);
      } else {
        if (nextScheduled) nextScheduled = addDays(nextScheduled, 1);
        if (nextDue) nextDue = addDays(nextDue, 1);
      }

      const nextTask = {
        title: task.title,
        notes: task.notes,
        category: task.category,
        status: 'todo',
        priority: task.priority,
        estimated_minutes: task.estimated_minutes,
        tags: task.tags,
        position: task.position,
        is_recurring: true,
        recurrence_rule: task.recurrence_rule,
        user_id: task.user_id,
        scheduled_for: nextScheduled ? nextScheduled.toISOString() : null,
        due_date: nextDue ? nextDue.toISOString() : null,
      };

      const { data: newRec } = await supabase.from('tasks').insert(nextTask).select().single();
      if (newRec) {
        set((state) => {
          if (state.tasks.find(t => t.id === newRec.id)) return state;
          return { tasks: [newRec, ...state.tasks] };
        });
      }
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
