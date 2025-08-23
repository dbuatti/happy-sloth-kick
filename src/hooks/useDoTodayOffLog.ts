import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DoTodayOffLogEntry, NewDoTodayOffLogEntryData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const fetchDoTodayOffLog = async (userId: string): Promise<DoTodayOffLogEntry[]> => {
  const { data, error } = await supabase
    .from('do_today_off_log')
    .select('*')
    .eq('user_id', userId)
    .order('off_date', { ascending: false });
  if (error) throw error;
  return data as DoTodayOffLogEntry[];
};

const addDoTodayOffLogEntry = async (newEntry: NewDoTodayOffLogEntryData & { user_id: string }): Promise<DoTodayOffLogEntry> => {
  const { data, error } = await supabase
    .from('do_today_off_log')
    .insert(newEntry)
    .select('*')
    .single();
  if (error) throw error;
  return data as DoTodayOffLogEntry;
};

const deleteDoTodayOffLogEntry = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('do_today_off_log')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const useDoTodayOffLog = () => {
  const { userId, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: offLogEntries, isLoading, error } = useQuery<DoTodayOffLogEntry[], Error>({
    queryKey: ['doTodayOffLog', userId],
    queryFn: () => fetchDoTodayOffLog(userId!),
    enabled: !!userId && !authLoading,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['doTodayOffLog', userId] });
  };

  const addEntryMutation = useMutation<DoTodayOffLogEntry, Error, { taskId: string; offDate: Date }>({
    mutationFn: async ({ taskId, offDate }) => {
      if (!userId) throw new Error('User not authenticated.');
      const newEntry: NewDoTodayOffLogEntryData & { user_id: string } = {
        user_id: userId,
        task_id: taskId,
        off_date: format(offDate, 'yyyy-MM-dd'),
      };
      return addDoTodayOffLogEntry(newEntry);
    },
    onSuccess: invalidateQueries,
  });

  const deleteEntryMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteDoTodayOffLogEntry(id),
    onSuccess: invalidateQueries,
  });

  return {
    offLogEntries: offLogEntries || [],
    isLoading,
    error,
    addDoTodayOffLogEntry: addEntryMutation.mutateAsync,
    deleteDoTodayOffLogEntry: deleteEntryMutation.mutateAsync,
  };
};