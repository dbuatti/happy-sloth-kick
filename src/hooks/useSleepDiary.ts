import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SleepRecord } from '@/types';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_SIZE = 7; // Fetch 7 days at a time

const fetchSleepDiaryPage = async (userId: string, pageParam: number): Promise<SleepRecord[]> => {
  const { data, error } = await supabase
    .from('sleep_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false }) // Most recent first
    .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  if (error) throw error;
  return data as SleepRecord[];
};

export const useSleepDiary = () => {
  const { userId, isLoading: authLoading } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<SleepRecord[], Error, SleepRecord[], string[], number>({
    queryKey: ['sleepDiary', userId!], // Added non-null assertion
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('User not authenticated.');
      return fetchSleepDiaryPage(userId, pageParam);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined; // No more pages
      }
      return allPages.length; // Next page is the current total number of pages
    },
    enabled: !!userId && !authLoading,
  });

  const allSleepRecords = data?.pages.flat() || [];

  return {
    allSleepRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};