import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchSleepRecords,
  addSleepRecord,
  updateSleepRecord,
  deleteSleepRecord,
} from '@/integrations/supabase/api';
import { SleepRecord } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseSleepRecordsProps {
  userId?: string | null;
}

interface NewSleepRecordData {
  date: string;
  bed_time: string | null;
  lights_off_time: string | null;
  wake_up_time: string | null;
  get_out_of_bed_time: string | null;
  time_to_fall_asleep_minutes: number | null;
  sleep_interruptions_count: number | null;
  sleep_interruptions_duration_minutes: number | null;
  times_left_bed_count: number | null;
  planned_wake_up_time: string | null;
  user_id: string;
}

export const useSleepRecords = (props?: UseSleepRecordsProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const recordsQueryKey = ['sleepRecords', activeUserId];

  const {
    data: sleepRecords = [],
    isLoading,
    error,
  } = useQuery<SleepRecord[], Error>({
    queryKey: recordsQueryKey,
    queryFn: () => fetchSleepRecords(activeUserId!),
    enabled: !!activeUserId,
  });

  const addRecordMutation = useMutation<SleepRecord | null, Error, NewSleepRecordData>({
    mutationFn: (newRecord) => addSleepRecord(newRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add record: ${err.message}`);
    },
  });

  const updateRecordMutation = useMutation<SleepRecord | null, Error, { id: string; updates: Partial<NewSleepRecordData> }>({
    mutationFn: ({ id, updates }) => updateSleepRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update record: ${err.message}`);
    },
  });

  const deleteRecordMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteSleepRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete record: ${err.message}`);
    },
  });

  const addSleepRecordCallback = useCallback(
    async (recordData: Partial<SleepRecord>): Promise<SleepRecord | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      if (!recordData.date) {
        showError('Date is required for sleep record.');
        return null;
      }
      try {
        const newRecord: NewSleepRecordData = {
          user_id: activeUserId,
          date: recordData.date,
          bed_time: recordData.bed_time || null,
          lights_off_time: recordData.lights_off_time || null,
          wake_up_time: recordData.wake_up_time || null,
          get_out_of_bed_time: recordData.get_out_of_bed_time || null,
          time_to_fall_asleep_minutes: recordData.time_to_fall_asleep_minutes || null,
          sleep_interruptions_count: recordData.sleep_interruptions_count || null,
          sleep_interruptions_duration_minutes: recordData.sleep_interruptions_duration_minutes || null,
          times_left_bed_count: recordData.times_left_bed_count || null,
          planned_wake_up_time: recordData.planned_wake_up_time || null,
        };
        const result = await addRecordMutation.mutateAsync(newRecord);
        showSuccess('Sleep record added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, addRecordMutation]
  );

  const updateSleepRecordCallback = useCallback(
    async (recordId: string, updates: Partial<SleepRecord>): Promise<SleepRecord | null> => {
      try {
        const result = await updateRecordMutation.mutateAsync({ id: recordId, updates: updates as Partial<NewSleepRecordData> });
        showSuccess('Sleep record updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateRecordMutation]
  );

  const deleteSleepRecordCallback = useCallback(
    async (recordId: string): Promise<void> => {
      try {
        await deleteRecordMutation.mutateAsync(recordId);
        showSuccess('Sleep record deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteRecordMutation]
  );

  return {
    sleepRecords,
    isLoading,
    error,
    addSleepRecord: addSleepRecordCallback,
    updateSleepRecord: updateSleepRecordCallback,
    deleteSleepRecord: deleteSleepRecordCallback,
  };
};