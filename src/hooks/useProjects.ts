import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Project, NewProjectData, UpdateProjectData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const useProjects = (sortOption: string = 'created_at') => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateProjectsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects', userId] });
  }, [queryClient, userId]);

  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ['projects', userId, sortOption],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order(sortOption as keyof Project, { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addProjectMutation = useMutation<Project, Error, NewProjectData, unknown>({
    mutationFn: async (newProjectData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...newProjectData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProjectsQueries();
    },
  });

  const updateProjectMutation = useMutation<Project, Error, { id: string; updates: UpdateProjectData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateProjectsQueries();
    },
  });

  const deleteProjectMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProjectsQueries();
    },
  });

  return {
    projects,
    isLoading,
    error,
    addProject: addProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
  };
};