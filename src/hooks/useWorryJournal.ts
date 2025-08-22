import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchWorryJournalEntries,
  addWorryJournalEntry,
  deleteWorryJournalEntry,
} from '@/integrations/supabase/api';
import { WorryJournalEntry } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseWorryJournalProps {
  userId?: string | null;
}

interface NewWorryEntryData {
  thought: string;
  user_id: string;
}

export const useWorryJournal = (props?: UseWorryJournalProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const entriesQueryKey = ['worryJournalEntries', activeUserId];

  const {
    data: entries = [],
    isLoading,
    error,
  } = useQuery<WorryJournalEntry[], Error>({
    queryKey: entriesQueryKey,
    queryFn: () => fetchWorryJournalEntries(activeUserId!),
    enabled: !!activeUserId,
  });

  const addEntryMutation = useMutation<WorryJournalEntry | null, Error, NewWorryEntryData>({
    mutationFn: (newEntry) => addWorryJournalEntry(newEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add entry: ${err.message}`);
    },
  });

  const deleteEntryMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteWorryJournalEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete entry: ${err.message}`);
    },
  });

  const addEntryCallback = useCallback(
    async (thought: string): Promise<WorryJournalEntry | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newEntryData: NewWorryEntryData = {
          user_id: activeUserId,
          thought,
        };
        const result = await addEntryMutation.mutateAsync(newEntryData);
        showSuccess('Entry added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addEntryMutation]
  );

  const deleteEntryCallback = useCallback(
    async (entryId: string): Promise<void> => {
      try {
        await deleteEntryMutation.mutateAsync(entryId);
        showSuccess('Entry deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteEntryMutation]
  );

  return {
    entries,
    isLoading,
    error,
    addEntry: addEntryCallback,
    deleteEntry: deleteEntryCallback,
  };
};