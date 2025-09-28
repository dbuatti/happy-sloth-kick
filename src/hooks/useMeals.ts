"use client";

import { useQuery } from '@tanstack/react-query';
import { fetchMeals } from '@/integrations/supabase/queries';
import { Meal } from '@/types/meals';

export const useMeals = (userId: string | undefined, startDate: Date, numberOfDays: number) => {
  return useQuery<Meal[], Error>({
    queryKey: ['meals', userId, startDate.toISOString().split('T')[0], numberOfDays],
    queryFn: () => {
      if (!userId) {
        throw new Error('User ID is required to fetch meals.');
      }
      return fetchMeals(userId, startDate, numberOfDays);
    },
    enabled: !!userId, // Only run the query if userId is available
  });
};