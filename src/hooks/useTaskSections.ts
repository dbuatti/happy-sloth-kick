// src/hooks/useTaskSections.ts
import { useState, useEffect, useCallback } from 'react';
import { TaskSection } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export const useTaskSections = (userId: string | undefined) => {
  const [data, setData] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (sectionsError) {
      setError(sectionsError.message);
      setData([]);
    } else {
      setData(sectionsData || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};