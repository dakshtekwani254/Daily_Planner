import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type FocusSession = Database['public']['Tables']['focus_sessions']['Row'];

interface SessionState {
  sessions: FocusSession[];
  loading: boolean;
  initialized: boolean;
  fetchSessions: (userId: string) => Promise<void>;
  addSession: (session: Omit<FocusSession, 'id' | 'started_at' | 'ended_at' | 'actual_seconds' | 'completed' | 'user_id'>, userId: string) => Promise<FocusSession>;
  updateSession: (id: string, updates: Partial<FocusSession>) => Promise<void>;
  handleRealtimeEvent: (payload: any) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  loading: false,
  initialized: false,
  
  fetchSessions: async (userId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
      
    if (!error && data) {
      set({ sessions: data, initialized: true });
    }
    set({ loading: false });
  },

  addSession: async (session, userId) => {
    const tempId = `temp-${Date.now()}`;
    const newSession: FocusSession = {
      ...session,
      id: tempId,
      user_id: userId,
      started_at: new Date().toISOString(),
      ended_at: null,
      actual_seconds: null,
      completed: false,
    };
    
    set((state) => ({ sessions: [newSession, ...state.sessions] }));

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ ...session, user_id: userId })
      .select()
      .single();

    if (error) {
      set((state) => ({ sessions: state.sessions.filter((s) => s.id !== tempId) }));
      throw error;
    } else {
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === tempId ? data : s)),
      }));
      return data;
    }
  },

  updateSession: async (id, updates) => {
    const prevSessions = get().sessions;
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));

    const { error } = await supabase
      .from('focus_sessions')
      .update(updates)
      .eq('id', id);

    if (error) {
      set({ sessions: prevSessions });
      throw error;
    }
  },

  handleRealtimeEvent: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    set((state) => {
      let nextSessions = [...state.sessions];
      
      if (eventType === 'INSERT') {
        if (!nextSessions.find(s => s.id === newRecord.id)) {
          nextSessions.unshift(newRecord as FocusSession);
        }
      } else if (eventType === 'UPDATE') {
        nextSessions = nextSessions.map(s => s.id === newRecord.id ? (newRecord as FocusSession) : s);
      } else if (eventType === 'DELETE') {
        nextSessions = nextSessions.filter(s => s.id !== oldRecord.id);
      }
      
      nextSessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      return { sessions: nextSessions };
    });
  }
}));
