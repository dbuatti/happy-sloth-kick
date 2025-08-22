import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchWeeklyFocus,
  upsertWeeklyFocus,
} from '@/integrations/supabase/api';
import { WeeklyFocus } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseWeeklyFocusProps {
  userId?: string | null;
  weekStartDate: string;
}

export const useWeeklyFocus = (props: UseWeeklyFocusProps) => {
  const { user } = useAuth();
  const activeUserId = props.userId || user?.id;
  const queryClient = useQueryClient();

  const focusQueryKey = ['weeklyFocus', activeUserId, props.weekStartDate];

  const {
    data: weeklyFocus,
    isLoading,
    error,
  } = useQuery<WeeklyFocus | null, Error>({
    queryKey: focusQueryKey,
    queryFn: () => fetchWeeklyFocus(activeUserId!, props.weekStartDate),
    enabled: !!activeUserId,
  });

  const upsertFocusMutation = useMutation<WeeklyFocus | null, Error, Partial<WeeklyFocus>>({
    mutationFn: (focusData) => upsertWeeklyFocus(focusData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: focusQueryKey });
    },
    onError: (err) => {
      showError(`Failed to save weekly focus: ${err.message}`);
    },
  });

  const updateWeeklyFocusCallback = useCallback(
    async (updates: Partial<WeeklyFocus>): Promise<WeeklyFocus | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const dataToUpsert: Partial<WeeklyFocus> = {
          user_id: activeUserId,
          week_start_date: props.weekStartDate,
          ...updates,
        };
        const result = await upsertFocusMutation.mutateAsync(dataToUpsert);
        showSuccess('Weekly focus updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, props.weekStartDate, upsertFocusMutation]
  );

  return {
    weeklyFocus,
    isLoading,
    error,
    updateWeeklyFocus: updateWeeklyFocusCallback,
  };
};