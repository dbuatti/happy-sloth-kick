import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Person {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  notes: string | null;
  created_at: string;
}

export const usePeopleMemory = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const { data: people = [], isLoading: loading, error } = useQuery<Person[], Error>({
    queryKey: ['peopleMemory', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('people_memory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      showError('Failed to load people.');
      console.error(error);
    }
  }, [error]);

  const addPersonMutation = useMutation<Person, Error, { personData: { name: string; notes: string | null }; avatarFile?: File | null }>({
    mutationFn: async ({ personData, avatarFile }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data: newPerson, error: insertError } = await supabase
        .from('people_memory')
        .insert({ ...personData, user_id: userId })
        .select()
        .single();
      if (insertError) throw insertError;

      if (avatarFile) {
        const filePath = `people_avatars/${userId}/${newPerson.id}/${uuidv4()}`;
        const { error: uploadError } = await supabase.storage
          .from('devideaimages')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('devideaimages').getPublicUrl(filePath);
        
        const { data: updatedPerson, error: updateError } = await supabase
          .from('people_memory')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', newPerson.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return updatedPerson;
      } else {
        return newPerson;
      }
    },
    onSuccess: () => {
      showSuccess('Person added!');
      queryClient.invalidateQueries({ queryKey: ['peopleMemory', userId] });
    },
    onError: (err) => {
      showError('Failed to add person.');
      console.error(err);
    },
  });

  const updatePersonMutation = useMutation<Person, Error, { id: string; updates: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>; avatarFile?: File | null }>({
    mutationFn: async ({ id, updates, avatarFile }) => {
      if (!userId) throw new Error('User not authenticated.');
      const finalUpdates = { ...updates };

      if (avatarFile) {
        const personToUpdate = people.find(p => p.id === id);
        if (personToUpdate?.avatar_url) {
          const oldFilePath = personToUpdate.avatar_url.split('/devideaimages/')[1];
          if (oldFilePath) {
            await supabase.storage.from('devideaimages').remove([oldFilePath]);
          }
        }

        const filePath = `people_avatars/${userId}/${id}/${uuidv4()}`;
        const { error: uploadError } = await supabase.storage
          .from('devideaimages')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('devideaimages').getPublicUrl(filePath);
        finalUpdates.avatar_url = urlData.publicUrl;
      } else if (updates.avatar_url === null) {
        // If avatar_url is explicitly set to null, remove existing image
        const personToUpdate = people.find(p => p.id === id);
        if (personToUpdate?.avatar_url) {
          const oldFilePath = personToUpdate.avatar_url.split('/devideaimages/')[1];
          if (oldFilePath) {
            await supabase.storage.from('devideaimages').remove([oldFilePath]);
          }
        }
      }

      const { data, error } = await supabase
        .from('people_memory')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Person updated!');
      queryClient.invalidateQueries({ queryKey: ['peopleMemory', userId] });
    },
    onError: (err) => {
      showError('Failed to update person.');
      console.error(err);
    },
  });

  const deletePersonMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('people_memory').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Person removed.');
      queryClient.invalidateQueries({ queryKey: ['peopleMemory', userId] });
    },
    onError: (err) => {
      showError('Failed to remove person.');
      console.error(err);
    },
  });

  return {
    people,
    loading,
    addPerson: addPersonMutation.mutateAsync,
    updatePerson: updatePersonMutation.mutateAsync,
    deletePerson: deletePersonMutation.mutateAsync,
  };
};