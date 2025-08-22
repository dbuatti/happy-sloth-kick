import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchGratitudeJournalEntries,
  addGratitudeJournalEntry,
  deleteGratitudeJournalEntry,
} from '@/integrations/supabase/api';
import { GratitudeJournalEntry } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseGratitudeJournalProps {
  userId?: string | null;
}

interface NewGratitudeEntryData {
  entry: string;
  user_id: string;
}

export const useGratitudeJournal = (props?: UseGratitudeJournalProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const entriesQueryKey = ['gratitudeJournalEntries', activeUserId];

  const {
    data: entries = [],
    isLoading,
    error,
  } = useQuery<GratitudeJournalEntry[], Error>({
    queryKey: entriesQueryKey,
    queryFn: () => fetchGratitudeJournalEntries(activeUserId!),
    enabled: !!activeUserId,
  });

  const addEntryMutation = useMutation<GratitudeJournalEntry | null, Error, NewGratitudeEntryData>({
    mutationFn: (newEntry) => addGratitudeJournalEntry(newEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add entry: ${err.message}`);
    },
  });

  const deleteEntryMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteGratitudeJournalEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete entry: ${err.message}`);
    },
  });

  const addEntryCallback = useCallback(
    async (entry: string): Promise<GratitudeJournalEntry | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newEntryData: NewGratitudeEntryData = {
          user_id: activeUserId,
          entry,
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