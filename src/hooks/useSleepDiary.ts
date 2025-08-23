import { useAuth } from '@/context/AuthContext';
import { SleepRecord } from '@/types';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseSleepDiaryProps {
  userId?: string;
}

export const useSleepDiary = ({ userId }: UseSleepDiaryProps) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<SleepRecord[], Error, InfiniteData<SleepRecord[], unknown>, ['sleepDiary', string | undefined], string | null>({
    queryKey: ['sleepDiary', currentUserId],
    queryFn: async ({ pageParam }) => {
      if (!currentUserId) return [];

      let query = supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false })
        .limit(7); // Fetch 7 days at a time

      if (pageParam) {
        query = query.lt('date', pageParam); // Fetch records older than pageParam (last fetched date)
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SleepRecord[];
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1]?.date || undefined;
    },
    enabled: !!currentUserId,
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