// src/hooks/useTaskSections.ts
import { useState, useEffect, useCallback } from 'react';
import { TaskSection } from '@/hooks/useTasks'; // Import TaskSection type
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSections } from '@/integrations/supabase/api'; // Import the moved fetch function

export const useTaskSections = () => {
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data, isLoading: loading, error, refetch } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId],
    queryFn: () => fetchSections(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching task sections:', error.message);
    }
  }, [error]);

  // Real-time subscription for task_sections
  useEffect(() => {
    if (!userId) return;

    const sectionsChannel = supabase
      .channel('sections_channel_hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_sections', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task_sections', userId] });
          queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Invalidate tasks as their section_id might change
          queryClient.invalidateQueries({ queryKey: ['dailyTaskCount', userId] }); // Invalidate daily task count
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sectionsChannel);
    };
  }, [userId, queryClient]);

  return { data: data || [], loading, error, refetch };
};