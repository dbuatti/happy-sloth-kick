import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchPeopleMemory,
  addPeopleMemory,
  updatePeopleMemory,
  deletePeopleMemory,
} from '@/integrations/supabase/api';
import { PeopleMemory } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UsePeopleMemoryProps {
  userId?: string | null;
}

interface NewPersonData {
  name: string;
  notes: string | null;
  avatar_url: string | null;
  user_id: string;
}

export const usePeopleMemory = (props?: UsePeopleMemoryProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const peopleQueryKey = ['peopleMemory', activeUserId];

  const {
    data: people = [],
    isLoading,
    error,
  } = useQuery<PeopleMemory[], Error>({
    queryKey: peopleQueryKey,
    queryFn: () => fetchPeopleMemory(activeUserId!),
    enabled: !!activeUserId,
  });

  const addPersonMutation = useMutation<PeopleMemory | null, Error, NewPersonData>({
    mutationFn: (newPerson) => addPeopleMemory(newPerson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add person: ${err.message}`);
    },
  });

  const updatePersonMutation = useMutation<PeopleMemory | null, Error, { id: string; updates: Partial<NewPersonData> }>({
    mutationFn: ({ id, updates }) => updatePeopleMemory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update person: ${err.message}`);
    },
  });

  const deletePersonMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deletePeopleMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete person: ${err.message}`);
    },
  });

  const addPersonCallback = useCallback(
    async (name: string, notes: string | null, avatarUrl: string | null): Promise<PeopleMemory | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newPersonData: NewPersonData = {
          user_id: activeUserId,
          name,
          notes,
          avatar_url: avatarUrl,
        };
        const result = await addPersonMutation.mutateAsync(newPersonData);
        showSuccess('Person added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addPersonMutation]
  );

  const updatePersonCallback = useCallback(
    async (personId: string, updates: Partial<PeopleMemory>): Promise<PeopleMemory | null> => {
      try {
        const result = await updatePersonMutation.mutateAsync({ id: personId, updates: updates as Partial<NewPersonData> });
        showSuccess('Person updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updatePersonMutation]
  );

  const deletePersonCallback = useCallback(
    async (personId: string): Promise<void> => {
      try {
        await deletePersonMutation.mutateAsync(personId);
        showSuccess('Person deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deletePersonMutation]
  );

  return {
    people,
    isLoading,
    error,
    addPerson: addPersonCallback,
    updatePerson: updatePersonCallback,
    deletePerson: deletePersonCallback,
  };
};