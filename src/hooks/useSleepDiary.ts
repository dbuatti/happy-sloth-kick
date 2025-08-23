import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SleepRecord } from '@/types';
import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query'; // Added InfiniteData
import { format } from 'date-fns';

export const useSleepDiary = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<SleepRecord[], Error, InfiniteData<SleepRecord[]>, string[], number>({ // Corrected type for data
    queryKey: ['sleepDiary', userId!],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(pageParam * 10, (pageParam + 1) * 10 - 1); // Fetch 10 records per page
      if (error) throw error;
      return data;
    },
    initialPageParam: 0, // Added initialPageParam
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0) return undefined;
      return allPages.length;
    },
    enabled: !!userId && !authLoading,
  });

  const allSleepRecords = data?.pages.flat() || []; // Corrected access to data.pages

  return {
    allSleepRecords,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};