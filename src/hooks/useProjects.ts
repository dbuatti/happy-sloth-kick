import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';

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

export const useProjects = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionTitle, setSectionTitle] = useState('Project Balance Tracker');
  const [sortOption, setSortOption] = useState<ProjectSortOption>(getInitialSortOption);

  // Effect to save sortOption to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('project_sort_option', sortOption);
    }
  }, [sortOption]);

  const fetchProjectsAndSettings = useCallback(async () => {
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

      // Fetch user settings for section title
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('project_tracker_title')
        .eq('user_id', userId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw settingsError;
      }

      if (settingsData) {
        setSectionTitle(settingsData.project_tracker_title);
      } else {
        // If no settings found, insert default
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: userId, project_tracker_title: 'Project Balance Tracker' });
        if (insertError) throw insertError;
        setSectionTitle('Project Balance Tracker');
      }

    } catch (error: any) {
      console.error('Error fetching projects or settings:', error);
      showError('Failed to load projects or settings.');
    } finally {
      setLoading(false);
    }
  }, [userId, sortOption]);

  useEffect(() => {
    fetchProjectsAndSettings();
  }, [fetchProjectsAndSettings]);

  const addProject = useCallback(async (name: string, description: string | null, link: string | null) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: userId, name, description, current_count: 0, link })
        .select()
        .single();

      if (error) throw error;
      // Re-fetch to ensure correct sorting after adding
      await fetchProjectsAndSettings(); 
      showSuccess('Project added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding project:', error);
      showError('Failed to add project.');
      return false;
    }
  }, [userId, fetchProjectsAndSettings]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      // Re-fetch to ensure correct sorting after updating
      await fetchProjectsAndSettings();
      showSuccess('Project updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating project:', error);
      showError('Failed to update project.');
      return false;
    }
  }, [userId, fetchProjectsAndSettings]);

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
      await fetchProjectsAndSettings();
      showSuccess('Project deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting project:', error);
      showError('Failed to delete project.');
      return false;
    }
  }, [userId, fetchProjectsAndSettings]);

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
      await fetchProjectsAndSettings();
      showSuccess('All project counters reset!');
      return true;
    } catch (error: any) {
      console.error('Error resetting project counts:', error);
      showError('Failed to reset project counts.');
      return false;
    }
  }, [userId, fetchProjectsAndSettings]);

  const updateProjectTrackerTitle = useCallback(async (newTitle: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, project_tracker_title: newTitle }, { onConflict: 'user_id' });

      if (error) throw error;
      setSectionTitle(newTitle);
      showSuccess('Tracker title updated!');
      return true;
    } catch (error: any) {
      console.error('Error updating section title:', error);
      showError('Failed to update tracker title.');
      return false;
    }
  }, [userId]);

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