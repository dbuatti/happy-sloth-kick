import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Person, NewPersonData, UpdatePersonData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

const fetchPeople = async (userId: string): Promise<Person[]> => {
  const { data, error } = await supabase
    .from('people_memory')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Person[];
};

const addPerson = async (newPerson: NewPersonData & { user_id: string }): Promise<Person> => {
  const { data, error } = await supabase
    .from('people_memory')
    .insert(newPerson)
    .select('*')
    .single();
  if (error) throw error;
  return data as Person;
};

const updatePerson = async (id: string, updates: UpdatePersonData): Promise<Person> => {
  const { data, error } = await supabase
    .from('people_memory')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Person;
};

const deletePerson = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('people_memory')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const usePeopleMemory = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: people, isLoading, error } = useQuery<Person[], Error>({
    queryKey: ['peopleMemory', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchPeople(userId);
    },
    enabled: !!userId && !authLoading,
  });

  const invalidatePeopleQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['peopleMemory', userId] });
  }, [queryClient, userId]);

  const addPersonMutation = useMutation<Person, Error, { personData: { name: string; notes: string | null }; avatarFile?: File | null }>({
    mutationFn: async ({ personData, avatarFile }) => {
      if (!userId) throw new Error('User not authenticated.');

      let avatar_url: string | null = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatar_url = publicUrlData.publicUrl;
      }

      return addPerson({ ...personData, user_id: userId, avatar_url });
    },
    onSuccess: invalidatePeopleQueries,
  });

  const updatePersonMutation = useMutation<Person, Error, { id: string; updates: UpdatePersonData; avatarFile?: File | null }>({
    mutationFn: async ({ id, updates, avatarFile }) => {
      if (!userId) throw new Error('User not authenticated.');

      let avatar_url: string | null | undefined = updates.avatar_url; // Allow explicit null to remove avatar

      if (avatarFile) {
        // If a new file is provided, upload it
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatar_url = publicUrlData.publicUrl;

        // Optionally, delete old avatar if it exists
        const personToUpdate = (people as Person[]).find(p => p.id === id);
        if (personToUpdate?.avatar_url) {
          const oldFilePath = personToUpdate.avatar_url.split('/avatars/')[1];
          await supabase.storage.from('avatars').remove([oldFilePath]);
        }
      } else if (updates.avatar_url === null) {
        // If avatar_url is explicitly set to null, remove existing image
        const personToUpdate = (people as Person[]).find(p => p.id === id);
        if (personToUpdate?.avatar_url) {
          const oldFilePath = personToUpdate.avatar_url.split('/avatars/')[1];
          await supabase.storage.from('avatars').remove([oldFilePath]);
        }
      }

      return updatePerson(id, { ...updates, avatar_url });
    },
    onSuccess: invalidatePeopleQueries,
  });

  const deletePersonMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const personToDelete = (people as Person[]).find(p => p.id === id);
      if (personToDelete?.avatar_url) {
        const filePath = personToDelete.avatar_url.split('/avatars/')[1];
        await supabase.storage.from('avatars').remove([filePath]);
      }
      return deletePerson(id);
    },
    onSuccess: invalidatePeopleQueries,
  });

  return {
    people: people || [],
    isLoading,
    error,
    addPerson: addPersonMutation.mutateAsync,
    updatePerson: updatePersonMutation.mutateAsync,
    deletePerson: deletePersonMutation.mutateAsync,
  };
};