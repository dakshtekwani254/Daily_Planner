import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTaskStore } from '@/store/taskStore';
import { useProjectStore } from '@/store/projectStore';
import { useNotesStore } from '@/store/notesStore';
import { useLearningStore } from '@/store/learningStore';
import { useLeetcodeStore } from '@/store/leetcodeStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTaskCategoryStore } from '@/store/taskCategoryStore';
import { useAuth } from '@/hooks/use-auth';

export function useRealtimeSync() {
  const { user } = useAuth();
  const handleTaskEvent = useTaskStore(state => state.handleRealtimeEvent);
  const handleProjectEvent = useProjectStore(state => state.handleRealtimeEvent);
  const handleNoteEvent = useNotesStore(state => state.handleRealtimeEvent);
  const handleLearningEvent = useLearningStore(state => state.handleRealtimeEvent);
  const handleLeetcodeEvent = useLeetcodeStore(state => state.handleRealtimeEvent);
  const handleSessionEvent = useSessionStore(state => state.handleRealtimeEvent);
  const handleSubjectEvent = useSubjectStore(state => state.handleRealtimeEvent);
  const handleTaskCategoryEvent = useTaskCategoryStore(state => state.handleRealtimeEvent);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        (payload) => handleTaskEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
        (payload) => handleProjectEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` },
        (payload) => handleNoteEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'learning_modules', filter: `user_id=eq.${user.id}` },
        (payload) => handleLearningEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leetcode_entries', filter: `user_id=eq.${user.id}` },
        (payload) => handleLeetcodeEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${user.id}` },
        (payload) => handleSessionEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subjects', filter: `user_id=eq.${user.id}` },
        (payload) => handleSubjectEvent(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${user.id}` },
        (payload) => handleTaskCategoryEvent(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleTaskEvent, handleProjectEvent, handleNoteEvent, handleLearningEvent, handleLeetcodeEvent, handleSessionEvent, handleSubjectEvent, handleTaskCategoryEvent]);
}
