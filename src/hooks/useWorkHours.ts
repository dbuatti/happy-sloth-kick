import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserWorkHours,
  saveUserWorkHours,
} from '@/integrations/supabase/api';
import { WorkHour } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

export const useWorkHours = (userId?: string | null) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const workHoursQueryKey = ['userWorkHours', activeUserId];

  const {
    data: allWorkHours = [],
    isLoading,
    error,
  } = useQuery<WorkHour[], Error>({
    queryKey: workHoursQueryKey,
    queryFn: () => fetchUserWorkHours(activeUserId!),
    enabled: !!activeUserId,
  });

  const saveWorkHoursCallback = useCallback(
    async (hoursToSave: WorkHour | WorkHour[]): Promise<void> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return;
      }
      try {
        const hoursArray = Array.isArray(hoursToSave) ? hoursToSave : [hoursToSave];
        await saveUserWorkHours(activeUserId, hoursArray);
        queryClient.invalidateQueries({ queryKey: workHoursQueryKey });
        showSuccess('Work hours saved successfully!');
      } catch (err) {
        showError('Failed to save work hours.');
      }
    },
    [activeUserId, queryClient, workHoursQueryKey]
  );

  return {
    allWorkHours,
    isLoading,
    error,
    saveWorkHours: saveWorkHoursCallback,
  };
};