import { useAuth } from '@/context/AuthContext';
import { Person, NewPersonData, UpdatePersonData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

export const usePeopleMemory = () => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id;
  const queryClient = useQueryClient();

  const { data: people, isLoading, error, refetch } = useQuery<Person[], Error>({
    queryKey: ['peopleMemory', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('people_memory')
        .select('*')
        .eq('user_id', currentUserId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addPersonMutation = useMutation<Person, Error, NewPersonData, unknown>({
    mutationFn: async (newPersonData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('people_memory')
        .insert({ ...newPersonData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleMemory', currentUserId] });
      toast.success('Person added to memory!');
    },
  });

  const updatePersonMutation = useMutation<Person, Error, { id: string; updates: UpdatePersonData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('people_memory')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleMemory', currentUserId] });
      toast.success('Person updated!');
    },
  });

  const deletePersonMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('people_memory')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleMemory', currentUserId] });
      toast.success('Person deleted from memory.');
    },
  });

  return {
    people,
    isLoading,
    error,
    refetchPeople: refetch,
    addPerson: addPersonMutation.mutateAsync,
    updatePerson: updatePersonMutation.mutateAsync,
    deletePerson: deletePersonMutation.mutateAsync,
  };
};