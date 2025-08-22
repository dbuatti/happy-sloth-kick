import { useCallback } from 'react';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchSleepRecords } from '@/integrations/supabase/api';
import { SleepRecord } from '@/types/task'; // Corrected import path
import { showError } from '@/utils/toast';

interface UseSleepDiaryProps {
  userId?: string | null;
}

export const useSleepDiary = ({ userId }: UseSleepDiaryProps) => {
  const { user } = useAuth();
  const activeUserId = userId || user?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<SleepRecord[], Error, InfiniteData<SleepRecord[]>, string[], string>({
    queryKey: ['sleepRecords', activeUserId],
    queryFn: async ({ pageParam = '' }) => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return [];
      }
      // For simplicity, fetch all records for now. Pagination logic can be added later.
      const records = await fetchSleepRecords(activeUserId);
      return records;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Simple example: no pagination for now, so always return undefined
      return undefined;
    },
    enabled: !!activeUserId,
  });

  const sleepRecords = data?.pages.flatMap(page => page) || [];

  return {
    sleepRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};