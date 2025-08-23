import { useAuth } from '@/context/AuthContext';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UseTaskSectionsProps {
  userId?: string;
}

export const useTaskSections = ({ userId: propUserId }: UseTaskSectionsProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: taskSections, isLoading, error } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('user_id', currentUserId)
        .order('order', { ascending: true });

      if (error) throw error;
      return data as TaskSection[];
    },
    enabled: !!currentUserId,
  });

  const addSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData, unknown>({
    mutationFn: async (newSectionData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .insert({ ...newSectionData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      toast.success('Section added!');
    },
  });

  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('task_sections')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as TaskSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need section name updates
      toast.success('Section updated!');
    },
  });

  const deleteSectionMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('task_sections')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_sections', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentUserId] }); // Tasks might need section name updates
      toast.success('Section deleted!');
    },
  });

  return {
    taskSections: taskSections || [],
    isLoading,
    error,
    addSection: addSectionMutation.mutateAsync,
    updateSection: updateSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
  };
};