// src/hooks/useDoTodayOffLog.ts
import { useState, useEffect, useCallback } from 'react';
import { DoTodayOffLogEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { format, startOfDay } from 'date-fns';

// Exported standalone fetch function
export const fetchDoTodayOffLog = async (userId: string, date: Date): Promise<Set<string>> => {
  const formattedDate = format(startOfDay(date), 'yyyy-MM-dd');
  const { data: offLogData, error: offLogError } = await supabase
    .from('do_today_off_log')
    .select('task_id, original_task_id')
    .eq('user_id', userId)
    .eq('off_date', formattedDate);

  if (offLogError) {
    console.error('Error fetching do_today_off_log:', offLogError.message);
    throw offLogError;
  }

  const offIds = new Set<string>();
  (offLogData || []).forEach(entry => {
    offIds.add(entry.task_id);
    if (entry.original_task_id) {
      offIds.add(entry.original_task_id);
    }
  });
  return offIds;
};

export const useDoTodayOffLog = () => {
  const user = useUser();
  const userId = user?.id;
  const [data, setData] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setData(new Set());
      return;
    }

    setLoading(true);
    try {
      const offIds = await fetchDoTodayOffLog(userId, new Date());
      setData(offIds);
    } catch (err: any) {
      setError(err.message);
      setData(new Set());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};