import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SleepRecord } from '@/types';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query'; // Added InfiniteData

interface UseSleepDiaryProps {
  userId?: string;
}

export const useSleepDiary = ({ userId }: UseSleepDiaryProps) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<SleepRecord[], Error, InfiniteData<SleepRecord[]>, string[], number>({
    queryKey: ['sleepDiary', currentUserId!],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false })
        .range(pageParam * 10, (pageParam + 1) * 10 - 1); // Fetch 10 records per page
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0) return undefined;
      return allPages.length;
    },
    initialPageParam: 0, // Added initialPageParam
    enabled: !!currentUserId && !authLoading,
  });

  const allSleepRecords = data?.pages.flat() || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    allSleepRecords,
    isLoading,
    error,
    loadMore,
    hasMore: hasNextPage,
    isFetchingNextPage,
  };
};