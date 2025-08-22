// src/hooks/useTaskCategories.ts
import { useState, useEffect, useCallback } from 'react';
import { TaskCategory } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';

export const useTaskCategories = () => {
  const user = useUser();
  const userId = user?.id;
  const [data, setData] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (categoriesError) {
      setError(categoriesError.message);
      setData([]);
    } else {
      setData(categoriesData || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};