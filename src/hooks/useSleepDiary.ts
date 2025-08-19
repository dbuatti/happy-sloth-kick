import { useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { SleepRecord } from './useSleepRecords';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query'; // Import InfiniteData

const PAGE_SIZE = 14; // Fetch 14 days at a time

export const useSleepDiary = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<SleepRecord[], Error, InfiniteData<SleepRecord[]>, string[], number>({
    queryKey: ['sleepDiary', userId!], // Added non-null assertion
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) throw new Error('User not authenticated.');
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined; // No more pages
      }
      return allPages.length; // Next page number
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialPageParam: 0,
  });

  const records = useMemo(() => (data as InfiniteData<SleepRecord[]>)?.pages.flatMap((page: SleepRecord[]) => page) || [], [data]);
  const loading = isLoading || isFetchingNextPage;
  const hasMore = hasNextPage;

  useEffect(() => {
    if (error) {
      showError('Failed to load sleep diary.');
      console.error(error);
    }
  }, [error]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNextPage();
    }
  }, [loading, hasMore, fetchNextPage]);

  return { records, loading, hasMore, loadMore };
};