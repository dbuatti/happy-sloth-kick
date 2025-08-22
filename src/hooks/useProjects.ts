import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useSettings } from '@/context/SettingsContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_count: number;
  created_at: string;
  link: string | null;
  notes: string | null;
}

// Define the type for sort options
type ProjectSortOption = 'name_asc' | 'count_asc' | 'count_desc' | 'created_at_asc' | 'created_at_desc';

// Helper to get initial sort option from localStorage
const getInitialSortOption = (): ProjectSortOption => {
  if (typeof window !== 'undefined') {
    const storedSortOption = localStorage.getItem('project_sort_option');
    if (storedSortOption && ['name_asc', 'count_asc', 'count_desc', 'created_at_asc', 'created_at_desc'].includes(storedSortOption)) {
      return storedSortOption as ProjectSortOption;
    }
  }
  return 'created_at_asc'; // Default value
};

// Helper function to normalize URLs
const normalizeUrl = (url: string | null): string | null => {
  if (!url) return null;
  let processedUrl = url.trim();
  if (processedUrl === '') return null;
  // If it doesn't start with http:// or https://, prepend https://
  if (!/^https?:\/\//i.test(processedUrl)) {
    processedUrl = `https://${processedUrl}`;
  }
  return processedUrl;
};

export const useProjects = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const { settings, updateSettings } = useSettings();
  const queryClient = useQueryClient();

  const [sortOption, setSortOption] = useState<ProjectSortOption>(getInitialSortOption);

  // Effect to save sortOption to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('project_sort_option', sortOption);
    }
  }, [sortOption]);

  const { data: projects = [], isLoading: loading, error } = useQuery<Project[], Error>({
    queryKey: ['projects', userId, sortOption],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from('projects')
        .select('id, user_id, name, description, current_count, created_at, link, notes')
        .eq('user_id', userId);

      switch (sortOption) {
        case 'name_asc':
          query = query.order('name', { ascending: true });
          break;
        case 'count_asc':
          query = query.order('current_count', { ascending: true });
          break;
        case 'count_desc':
          query = query.order('current_count', { ascending: false });
          break;
        case 'created_at_asc':
          query = query.order('created_at', { ascending: true });
          break;
        case 'created_at_desc':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: true }); // Default sort
          break;
      }

      const { data: projectsData, error: projectsError } = await query;
      if (projectsError) throw projectsError;
      return projectsData || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching projects:', error);
      showError('Failed to load projects.');
    }
  }, [error]);

  const sectionTitle = settings?.project_tracker_title || 'Project Balance Tracker';

  const addProjectMutation = useMutation<Project, Error, { name: string; description: string | null; link: string | null }>({
    mutationFn: async ({ name, description, link }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: userId, name, description, current_count: 0, link: normalizeUrl(link) })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Project added successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
    onError: (err) => {
      console.error('Error adding project:', err);
      showError('Failed to add project.');
    },
  });

  const updateProjectMutation = useMutation<Project, Error, { projectId: string; updates: Partial<Project> }>({
    mutationFn: async ({ projectId, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const updatesToSend = { ...updates };
      if (updatesToSend.link !== undefined) {
        updatesToSend.link = normalizeUrl(updatesToSend.link);
      }
      const { data, error } = await supabase
        .from('projects')
        .update(updatesToSend)
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Project updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
    onError: (err) => {
      console.error('Error updating project:', err);
      showError('Failed to update project.');
    },
  });

  const deleteProjectMutation = useMutation<boolean, Error, string>({
    mutationFn: async (projectId) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Project deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
    onError: (err) => {
      console.error('Error deleting project:', err);
      showError('Failed to delete project.');
    },
  });

  const incrementProjectCount = useCallback(async (projectId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate && projectToUpdate.current_count < 10) {
      const newCount = projectToUpdate.current_count + 1;
      await updateProjectMutation.mutateAsync({ projectId, updates: { current_count: newCount } });
    }
  }, [userId, projects, updateProjectMutation]);

  const decrementProjectCount = useCallback(async (projectId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate && projectToUpdate.current_count > 0) {
      const newCount = projectToUpdate.current_count - 1;
      await updateProjectMutation.mutateAsync({ projectId, updates: { current_count: newCount } });
    }
  }, [userId, projects, updateProjectMutation]);

  const resetAllProjectCountsMutation = useMutation<boolean, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('projects')
        .update({ current_count: 0 })
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('All project counters reset!');
      queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    },
    onError: (err) => {
      console.error('Error resetting project counts:', err);
      showError('Failed to reset project counts.');
    },
  });

  const updateProjectTrackerTitle = useCallback(async (newTitle: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    return await updateSettings({ project_tracker_title: newTitle });
  }, [userId, updateSettings]);

  return {
    projects,
    loading,
    sectionTitle,
    addProject: addProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
    incrementProjectCount,
    decrementProjectCount,
    resetAllProjectCounts: resetAllProjectCountsMutation.mutateAsync,
    updateProjectTrackerTitle,
    userId,
    sortOption,
    setSortOption,
  };
};