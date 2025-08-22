// src/hooks/useDoTodayOffLog.ts
import { useState, useEffect, useCallback } from 'react';
import { DoTodayOffLogEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export const useDoTodayOffLog = (userId: string | undefined) => {
  const [data, setData] = useState<DoTodayOffLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: offLogData, error: offLogError } = await supabase
      .from('do_today_off_log')
      .select('*')
      .eq('user_id', userId)
      .order('off_date', { ascending: false });

    if (offLogError) {
      setError(offLogError.message);
      setData([]);
    } else {
      setData(offLogData || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};