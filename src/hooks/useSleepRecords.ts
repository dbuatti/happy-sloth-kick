import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SleepRecord, NewSleepRecordData, UpdateSleepRecordData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const fetchSleepRecord = async (userId: string, date: string): Promise<SleepRecord | null> => {
  const { data, error } = await supabase
    .from('sleep_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    throw error;
  }
  return data as SleepRecord | null;
};

const saveSleepRecord = async (record: NewSleepRecordData & { user_id: string }): Promise<SleepRecord> => {
  const { data, error } = await supabase
    .from('sleep_records')
    .insert(record)
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepRecord;
};

const updateSleepRecord = async (id: string, updates: UpdateSleepRecordData): Promise<SleepRecord> => {
  const { data, error } = await supabase
    .from('sleep_records')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepRecord;
};

export const useSleepRecords = (date: Date) => {
  const { userId, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const formattedDate = format(date, 'yyyy-MM-dd');

  const { data: sleepRecord, isLoading, error } = useQuery<SleepRecord | null, Error>({
    queryKey: ['sleepRecord', userId, formattedDate],
    queryFn: async () => {
      if (!userId) return null;
      return fetchSleepRecord(userId, formattedDate);
    },
    enabled: !!userId && !authLoading,
  });

  const invalidateSleepRecordQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sleepRecord', userId, formattedDate] });
    queryClient.invalidateQueries({ queryKey: ['sleepAnalytics', userId] }); // Invalidate analytics too
    queryClient.invalidateQueries({ queryKey: ['sleepDiary', userId] }); // Invalidate diary too
  }, [queryClient, userId, formattedDate]);

  const saveSleepRecordMutation = useMutation<SleepRecord, Error, NewSleepRecordData>({
    mutationFn: async (dataToSave) => {
      if (!userId) throw new Error('User not authenticated.');
      const existingRecord = await fetchSleepRecord(userId, dataToSave.date);
      if (existingRecord) {
        return updateSleepRecord(existingRecord.id, dataToSave);
      } else {
        return saveSleepRecord({ ...dataToSave, user_id: userId });
      }
    },
    onSuccess: invalidateSleepRecordQueries,
  });

  return {
    sleepRecord,
    isLoading,
    error,
    saveSleepRecord: saveSleepRecordMutation.mutateAsync,
  };
};