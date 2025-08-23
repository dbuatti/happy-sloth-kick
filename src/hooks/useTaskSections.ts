import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { TaskSection, NewTaskSectionData, UpdateTaskSectionData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

const fetchSections = async (userId: string): Promise<TaskSection[]> => {
  const { data, error } = await supabase
    .from('task_sections')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true });
  if (error) throw error;
  return data as TaskSection[];
};

const addSection = async (newSection: NewTaskSectionData & { user_id: string }): Promise<TaskSection> => {
  const { data, error } = await supabase
    .from('task_sections')
    .insert(newSection)
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskSection;
};

const updateSection = async (id: string, updates: UpdateTaskSectionData): Promise<TaskSection> => {
  const { data, error } = await supabase
    .from('task_sections')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskSection;
};

const deleteSection = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('task_sections')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const useTaskSections = () => {
  const { userId, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: sections, isLoading, error } = useQuery<TaskSection[], Error>({
    queryKey: ['task_sections', userId],
    queryFn: () => fetchSections(userId!),
    enabled: !!userId && !authLoading,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['task_sections', userId] });
  };

  const addSectionMutation = useMutation<TaskSection, Error, NewTaskSectionData>({
    mutationFn: async (newSection) => {
      if (!userId) throw new Error('User not authenticated.');
      return addSection({ ...newSection, user_id: userId });
    },
    onSuccess: invalidateQueries,
  });

  const updateSectionMutation = useMutation<TaskSection, Error, { id: string; updates: UpdateTaskSectionData }>({
    mutationFn: ({ id, updates }) => updateSection(id, updates),
    onSuccess: invalidateQueries,
  });

  const deleteSectionMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteSection(id),
    onSuccess: invalidateQueries,
  });

  return {
    sections: sections || [],
    isLoading,
    error,
    addSection: addSectionMutation.mutateAsync,
    updateSection: updateSectionMutation.mutateAsync,
    deleteSection: deleteSectionMutation.mutateAsync,
  };
};