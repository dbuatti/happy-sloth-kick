import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError } from '@/utils/toast';
import { subDays, startOfDay, endOfDay, formatISO } from 'date-fns';
import { SleepRecord } from './useSleepRecords';

const PAGE_SIZE = 14; // Fetch 14 days at a time

export const useSleepDiary = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchRecords = useCallback(async (pageNum: number) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        setRecords(prev => pageNum === 0 ? data : [...prev, ...data]);
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      showError('Failed to load sleep diary.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setRecords([]);
    setPage(0);
    setHasMore(true);
    if (userId) {
      fetchRecords(0);
    }
  }, [userId, fetchRecords]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRecords(nextPage);
    }
  }, [loading, hasMore, page, fetchRecords]);

  return { records, loading, hasMore, loadMore };
};