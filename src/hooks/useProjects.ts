import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useSettings, UserSettings } from '@/context/SettingsContext'; // Import UserSettings from SettingsContext

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  completed_at?: string;
  order: number;
}

export type ProjectSortOption = 'name_asc' | 'name_desc' | 'created_at_asc' | 'created_at_desc' | 'status';

interface UseProjectsOptions {
  userId?: string;
}

export const useProjects = ({ userId }: UseProjectsOptions) => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionTitle = settings?.project_tracker_title || 'Project Balance Tracker'; // Access project_tracker_title from settings
  const [sortOption, setSortOption] = useState<ProjectSortOption>(getInitialSortOption);

  const getInitialSortOption = () => {
    // You might store this in user settings later
    return 'created_at_desc';
  };

  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProjects();

    const projectsSubscription = supabase
      .channel('public:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectsSubscription);
    };
  }, [userId, fetchProjects]);

  const sortedProjects = useMemo(() => {
    let sorted = [...projects];
    switch (sortOption) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'created_at_asc':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'created_at_desc':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'status':
        sorted.sort((a, b) => {
          const statusOrder = { 'active': 1, 'completed': 2, 'archived': 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
        break;
    }
    return sorted;
  }, [projects, sortOption]);

  const addProject = async (newProjectData: Omit<Project, 'id' | 'user_id' | 'created_at' | 'order' | 'status'>) => {
    if (!user?.id) return null;
    const newOrder = projects.length > 0 ? Math.max(...projects.map(p => p.order || 0)) + 1 : 0;
    const newProject: Project = {
      id: crypto.randomUUID(),
      user_id: user.id,
      status: 'active',
      created_at: new Date().toISOString(),
      order: newOrder,
      ...newProjectData,
    };
    const { data, error } = await supabase
      .from('projects')
      .insert(newProject)
      .select()
      .single();
    if (error) {
      console.error('Error adding project:', error);
      return null;
    }
    return data;
  };

  const updateProject = async (projectId: string, updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error updating project:', error);
      return false;
    }
    return true;
  };

  const deleteProject = async (projectId: string) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);
    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }
    return true;
  };

  const updateProjectTrackerTitle = useCallback(async (newTitle: string) => {
    if (!userId) return false;
    return await updateSettings({ project_tracker_title: newTitle }); // Correctly updates UserSettings
  }, [userId, updateSettings]);

  return {
    projects: sortedProjects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    sortOption,
    setSortOption,
    sectionTitle,
    updateProjectTrackerTitle,
  };
};