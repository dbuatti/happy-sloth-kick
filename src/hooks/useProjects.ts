import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Project, NewProjectData, UpdateProjectData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

const fetchProjects = async (userId: string, sortOption: string): Promise<Project[]> => {
  let query = supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);

  if (sortOption === 'name') {
    query = query.order('name', { ascending: true });
  } else if (sortOption === 'count_asc') {
    query = query.order('current_count', { ascending: true });
  } else if (sortOption === 'count_desc') {
    query = query.order('current_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Project[];
};

const addProject = async (newProject: NewProjectData & { user_id: string }): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .insert(newProject)
    .select('*')
    .single();
  if (error) throw error;
  return data as Project;
};

const updateProject = async (id: string, updates: UpdateProjectData): Promise<Project> => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Project;
};

const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const useProjects = (sortOption: string = 'created_at') => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ['projects', userId, sortOption],
    queryFn: async () => {
      if (!userId) return [];
      return fetchProjects(userId, sortOption);
    },
    enabled: !!userId && !authLoading,
  });

  const addProjectMutation = useMutation<Project, Error, { name: string; description: string | null; link: string | null }>({
    mutationFn: async ({ name, description, link }) => {
      if (!userId) throw new Error('User not authenticated.');
      const newProjectData: NewProjectData & { user_id: string } = {
        user_id: userId,
        name,
        description,
        link,
        current_count: 0,
      };
      return addProject(newProjectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  const updateProjectMutation = useMutation<Project, Error, { projectId: string; updates: UpdateProjectData }>({
    mutationFn: async ({ projectId, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      return updateProject(projectId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  const deleteProjectMutation = useMutation<void, Error, string>({
    mutationFn: (projectId) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  const incrementProjectCount = useMutation<Project, Error, string>({
    mutationFn: async (projectId) => {
      if (!userId) throw new Error('User not authenticated.');
      const currentProjects = queryClient.getQueryData<Project[]>(['projects', userId, sortOption]) || [];
      const projectToUpdate = currentProjects.find(p => p.id === projectId);
      if (projectToUpdate && projectToUpdate.current_count < 10) {
        return updateProject(projectId, { current_count: projectToUpdate.current_count + 1 });
      }
      return projectToUpdate as Project; // Return original if no update
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  const decrementProjectCount = useMutation<Project, Error, string>({
    mutationFn: async (projectId) => {
      if (!userId) throw new Error('User not authenticated.');
      const currentProjects = queryClient.getQueryData<Project[]>(['projects', userId, sortOption]) || [];
      const projectToUpdate = currentProjects.find(p => p.id === projectId);
      if (projectToUpdate && projectToUpdate.current_count > 0) {
        return updateProject(projectId, { current_count: projectToUpdate.current_count - 1 });
      }
      return projectToUpdate as Project; // Return original if no update
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  return {
    projects: projects || [],
    isLoading,
    error,
    addProject: addProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
    incrementProjectCount: incrementProjectCount.mutateAsync,
    decrementProjectCount: decrementProjectCount.mutateAsync,
  };
};