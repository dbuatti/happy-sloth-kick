// src/hooks/useTaskCategories.ts
import { useState, useEffect, useCallback } from 'react';
import { Category } from '@/hooks/useTasks'; // Import Category type
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCategories } from '@/integrations/supabase/api'; // Import the moved fetch function

export const useTaskCategories = () => {
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data, isLoading: loading, error, refetch } = useQuery<Category[], Error>({
    queryKey: ['task_categories', userId],
    queryFn: () => fetchCategories(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching task categories:', error.message);
    }
  }, [error]);

  // Real-time subscription for task_categories
  useEffect(() => {
    if (!userId) return;

    const categoriesChannel = supabase
      .channel('categories_channel_hook')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_categories', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task_categories', userId] });
          queryClient.invalidateQueries({ queryKey: ['tasks', userId] }); // Invalidate tasks as their category might change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
    };
  }, [userId, queryClient]);

  return { data: data || [], loading, error, refetch };
};