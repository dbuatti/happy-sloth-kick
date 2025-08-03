import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useSettings } from '@/context/SettingsContext';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  current_count: number;
  created_at: string;
  link: string | null; // Added link field
}

export interface UserSettings {
  user_id: string;
  project_tracker_title: string;
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

export const useProjects = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { settings, updateSettings } = useSettings();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionTitle = settings?.project_tracker_title || 'Project Balance Tracker';
  const [sortOption, setSortOption] = useState<ProjectSortOption>(getInitialSortOption);

  // Effect to save sortOption to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('project_sort_option', sortOption);
    }
  }, [sortOption]);

  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch projects
      let query = supabase
        .from('projects')
        .select('*')
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
      setProjects(projectsData || []);

    } catch (error: any) {
      console.error('Error fetching projects:', error);
      showError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [userId, sortOption]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = useCallback(async (name: string, description: string | null, link: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('projects')
        .insert({ user_id: userId, name, description, current_count: 0, link: normalizeUrl(link) })
        .select()
        .single();

      if (error) throw error;
      // Re-fetch to ensure correct sorting after adding
      await fetchProjects(); 
      showSuccess('Project added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding project:', error);
      showError('Failed to add project.');
      return false;
    }
  }, [userId, fetchProjects]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const updatesToSend = { ...updates };
      if (updatesToSend.link !== undefined) {
        updatesToSend.link = normalizeUrl(updatesToSend.link);
      }

      const { error } = await supabase
        .from('projects')
        .update(updatesToSend)
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      // Re-fetch to ensure correct sorting after updating
      await fetchProjects();
      showSuccess('Project updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating project:', error);
      showError('Failed to update project.');
      return false;
    }
  }, [userId, fetchProjects]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
      // Re-fetch to ensure correct sorting after deleting
      await fetchProjects();
      showSuccess('Project deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting project:', error);
      showError('Failed to delete project.');
      return false;
    }
  }, [userId, fetchProjects]);

  const incrementProjectCount = useCallback(async (projectId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate && projectToUpdate.current_count < 10) {
      const newCount = projectToUpdate.current_count + 1;
      await updateProject(projectId, { current_count: newCount });
    }
  }, [userId, projects, updateProject]);

  const decrementProjectCount = useCallback(async (projectId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate && projectToUpdate.current_count > 0) {
      const newCount = projectToUpdate.current_count - 1;
      await updateProject(projectId, { current_count: newCount });
    }
  }, [userId, projects, updateProject]);

  const resetAllProjectCounts = useCallback(async () => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('projects')
        .update({ current_count: 0 })
        .eq('user_id', userId); // Only reset for the current user

      if (error) throw error;
      // Re-fetch to ensure correct sorting after resetting
      await fetchProjects();
      showSuccess('All project counters reset!');
      return true;
    } catch (error: any) {
      console.error('Error resetting project counts:', error);
      showError('Failed to reset project counts.');
      return false;
    }
  }, [userId, fetchProjects]);

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
    addProject,
    updateProject,
    deleteProject,
    incrementProjectCount,
    decrementProjectCount, // Export new decrement function
    resetAllProjectCounts,
    updateProjectTrackerTitle,
    userId,
    sortOption,
    setSortOption,
  };
};