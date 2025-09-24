import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface MealStaple {
  id: string;
  user_id: string;
  name: string;
  target_quantity: number;
  current_quantity: number;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

export type NewMealStapleData = Omit<MealStaple, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateMealStapleData = Partial<NewMealStapleData>;

interface UseMealStaplesProps {
  userId?: string;
}

export const useMealStaples = (props?: UseMealStaplesProps) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const { data: staples = [], isLoading: loading, error } = useQuery<MealStaple[], Error>({
    queryKey: ['mealStaples', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('meal_staples')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching meal staples:', error.message);
      showError('Failed to load meal staples.');
    }
  }, [error]);

  const addStapleMutation = useMutation<MealStaple, Error, NewMealStapleData>({
    mutationFn: async (newStaple) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('meal_staples')
        .insert({ ...newStaple, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Staple added successfully!');
      queryClient.invalidateQueries({ queryKey: ['mealStaples', userId] });
    },
    onError: (err) => {
      console.error('useMealStaples: Error adding staple:', err.message);
      showError('Failed to add staple.');
    },
  });

  const updateStapleMutation = useMutation<MealStaple, Error, { id: string; updates: UpdateMealStapleData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('meal_staples')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Staple updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['mealStaples', userId] });
    },
    onError: (err) => {
      console.error('useMealStaples: Error updating staple:', err.message);
      showError('Failed to update staple.');
    },
  });

  const deleteStapleMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('meal_staples')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Staple deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['mealStaples', userId] });
    },
    onError: (err) => {
      console.error('useMealStaples: Error deleting staple:', err.message);
      showError('Failed to delete staple.');
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('meal_staples-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_staples', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mealStaples', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    staples,
    loading,
    addStaple: addStapleMutation.mutateAsync,
    updateStaple: updateStapleMutation.mutateAsync,
    deleteStaple: deleteStapleMutation.mutateAsync,
  };
};