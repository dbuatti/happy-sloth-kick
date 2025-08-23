import { useAuth } from '@/context/AuthContext';
import { SleepRecord } from '@/types';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

const PAGE_SIZE = 7; // Fetch 7 days at a time

export const useSleepDiary = (userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<SleepRecord[], Error, InfiniteData<SleepRecord[]>, ['sleepDiary', string | undefined], string>({
    queryKey: ['sleepDiary', currentUserId],
    queryFn: async ({ pageParam = format(new Date(), 'yyyy-MM-dd') }) => {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId)
        .lte('date', pageParam)
        .order('date', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const lastRecordDate = lastPage[lastPage.length - 1]?.date;
      return lastRecordDate ? format(subDays(new Date(lastRecordDate), 1), 'yyyy-MM-dd') : undefined;
    },
    initialPageParam: format(new Date(), 'yyyy-MM-dd'),
    enabled: !!currentUserId && !authLoading,
  });

  const allSleepRecords = data?.pages.flat() || [];

  return {
    sleepRecords: allSleepRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};