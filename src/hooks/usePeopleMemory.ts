import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Person, NewPersonData, UpdatePersonData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const usePeopleMemory = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidatePeopleQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['peopleMemory', userId] });
  }, [queryClient, userId]);

  const { data: people, isLoading, error } = useQuery<Person[], Error>({
    queryKey: ['peopleMemory', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('people_memory')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addPersonMutation = useMutation<Person, Error, NewPersonData, unknown>({
    mutationFn: async (newPersonData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('people_memory')
        .insert({ ...newPersonData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidatePeopleQueries();
    },
  });

  const updatePersonMutation = useMutation<Person, Error, { id: string; updates: UpdatePersonData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('people_memory')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidatePeopleQueries();
    },
  });

  const deletePersonMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('people_memory')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidatePeopleQueries();
    },
  });

  return {
    people,
    isLoading,
    error,
    addPerson: addPersonMutation.mutateAsync,
    updatePerson: updatePersonMutation.mutateAsync,
    deletePerson: deletePersonMutation.mutateAsync,
  };
};