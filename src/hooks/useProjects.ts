import { useAuth } from '@/context/AuthContext';
import { Project, NewProjectData, UpdateProjectData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UseProjectsProps {
  userId?: string;
}

export const useProjects = ({ userId: propUserId }: UseProjectsProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ['projects', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentUserId,
  });

  const addProjectMutation = useMutation<Project, Error, NewProjectData, unknown>({
    mutationFn: async (newProjectData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...newProjectData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as Project;
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
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as Project;
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
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentUserId] });
      toast.success('Project deleted!');
    },
  });

  return {
    projects: projects || [],
    isLoading,
    error,
    addProject: addProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
  };
};