import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const useTaskSections = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateTaskSectionsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['task_sections', userId] });
  }, [queryClient, userId]);

  const { data: sections, isLoading, error } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', userId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData, unknown>({
    mutationFn: async (newSectionData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ ...newSectionData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTaskSectionsQueries();
    },
  });

  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTaskSectionsQueries();
    },
  });

  const deleteSectionMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTaskSectionsQueries();
    },
  });

  return {
    sections,
    isLoading,
    error,
    addSection: addSectionMutation.mutateAsync,
    updateSection: updateSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
  };
};