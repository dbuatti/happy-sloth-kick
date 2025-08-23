import { useAuth } from '@/context/AuthContext';
import { Project, NewProjectData, UpdateProjectData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

export const useProjects = (userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error, refetch } = useQuery<Project[], Error>({
    queryKey: ['projects', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addProjectMutation = useMutation<Project, Error, NewProjectData, unknown>({
    mutationFn: async (newProjectData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...newProjectData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentUserId] });
      toast.success('Project added!');
    },
  });

  const updateProjectMutation = useMutation<Project, Error, { id: string; updates: UpdateProjectData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentUserId] });
      toast.success('Project updated!');
    },
  });

  const deleteProjectMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentUserId] });
      toast.success('Project deleted!');
    },
  });

  return {
    projects,
    isLoading,
    error,
    refetchProjects: refetch,
    addProject: addProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
  };
};