import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchProjects,
  addProject,
  updateProject,
  deleteProject,
} from '@/integrations/supabase/api';
import { Project } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';
import { ProjectContextType } from '@/types/props';

interface UseProjectsProps {
  userId?: string | null;
}

export const useProjects = (props?: UseProjectsProps): ProjectContextType => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const projectsQueryKey = ['projects', activeUserId];

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery<Project[], Error>({
    queryKey: projectsQueryKey,
    queryFn: () => fetchProjects(activeUserId!),
    enabled: !!activeUserId,
  });

  const [sortOption, setSortOption] = useState('name');

  const addProjectCallback = useCallback(
    async (name: string, description: string | null, link: string | null): Promise<Project | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newProject = await addProject({ user_id: activeUserId, name, description, link, current_count: 0 });
        if (newProject) {
          queryClient.invalidateQueries({ queryKey: projectsQueryKey });
          showSuccess('Project added successfully!');
          return newProject;
        }
        return null;
      } catch (err: any) {
        showError('Failed to add project.');
        return null;
      }
    },
    [activeUserId, queryClient, projectsQueryKey]
  );

  const updateProjectCallback = useCallback(
    async (projectId: string, updates: Partial<Project>): Promise<Project | null> => {
      try {
        const updatedProject = await updateProject(projectId, updates);
        if (updatedProject) {
          queryClient.invalidateQueries({ queryKey: projectsQueryKey });
          showSuccess('Project updated successfully!');
          return updatedProject;
        }
        return null;
      } catch (err: any) {
        showError('Failed to update project.');
        return null;
      }
    },
    [queryClient, projectsQueryKey]
  );

  const deleteProjectCallback = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        await deleteProject(projectId);
        queryClient.invalidateQueries({ queryKey: projectsQueryKey });
        showSuccess('Project deleted successfully!');
      } catch (err: any) {
        showError('Failed to delete project.');
      }
    },
    [queryClient, projectsQueryKey]
  );

  const incrementProjectCount = useCallback(
    async (projectId: string): Promise<void> => {
      const projectToUpdate = projects.find((p) => p.id === projectId);
      if (projectToUpdate) {
        await updateProjectCallback(projectId, { current_count: projectToUpdate.current_count + 1 });
      }
    },
    [projects, updateProjectCallback]
  );

  const decrementProjectCount = useCallback(
    async (projectId: string): Promise<void> => {
      const projectToUpdate = projects.find((p) => p.id === projectId);
      if (projectToUpdate && projectToUpdate.current_count > 0) {
        await updateProjectCallback(projectId, { current_count: projectToUpdate.current_count - 1 });
      }
    },
    [projects, updateProjectCallback]
  );

  const resetAllProjectCounts = useCallback(
    async (): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      try {
        const projectUpdates = projects.map(p => ({ id: p.id, current_count: 0 }));
        // Assuming a bulk update function or individual updates
        for (const update of projectUpdates) {
          await updateProject(update.id, { current_count: update.current_count });
        }
        queryClient.invalidateQueries({ queryKey: projectsQueryKey });
        showSuccess('All project counts reset successfully!');
      } catch (err: any) {
        showError('Failed to reset all project counts.');
      }
    },
    [activeUserId, projects, queryClient, projectsQueryKey]
  );

  const sortedProjects = useMemo(() => {
    let sorted = [...projects];
    if (sortOption === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'countAsc') {
      sorted.sort((a, b) => a.current_count - b.current_count);
    } else if (sortOption === 'countDesc') {
      sorted.sort((a, b) => b.current_count - a.current_count);
    }
    return sorted;
  }, [projects, sortOption]);

  return {
    projects: sortedProjects,
    isLoading,
    error,
    sectionTitle: 'Project Balance Tracker',
    addProject: addProjectCallback,
    updateProject: updateProjectCallback,
    deleteProject: deleteProjectCallback,
    incrementProjectCount,
    decrementProjectCount,
    resetAllProjectCounts,
    sortOption,
    setSortOption,
  };
};