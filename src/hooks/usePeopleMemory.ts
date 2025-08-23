import { useAuth } from '@/context/AuthContext';
import { Person, NewPersonData, UpdatePersonData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UsePeopleMemoryProps {
  userId?: string;
}

export const usePeopleMemory = ({ userId: propUserId }: UsePeopleMemoryProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: people, isLoading, error } = useQuery<Person[], Error>({
    queryKey: ['people', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('people_memory')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Person[];
    },
    enabled: !!currentUserId,
  });

  const addPersonMutation = useMutation<Person, Error, NewPersonData, unknown>({
    mutationFn: async (newPersonData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('people_memory')
        .insert({ ...newPersonData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as Person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', currentUserId] });
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
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as Person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', currentUserId] });
      toast.success('Person updated!');
    },
  });

  const deletePersonMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('people_memory')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', currentUserId] });
      toast.success('Person deleted from memory!');
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