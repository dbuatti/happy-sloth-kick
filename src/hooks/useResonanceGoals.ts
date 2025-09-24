import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext'; // Added missing import

export type GoalType = 'daily' | 'weekly' | 'monthly' | '3-month' | '6-month' | '9-month' | 'yearly' | '3-year' | '5-year' | '7-year' | '10-year';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  type: GoalType;
  due_date: string | null; // YYYY-MM-DD
  completed: boolean;
  order: number | null;
  parent_goal_id: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string; // Client-side join
  category_color?: string; // Client-side join
}

// NewGoalData should allow 'order' and 'completed' to be optional as they might not be provided on creation
export type NewGoalData = Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category_name' | 'category_color'> & {
  order: number | null; // Made non-optional
  completed: boolean; // Made non-optional
};
export type UpdateGoalData = Partial<NewGoalData>;

interface UseResonanceGoalsProps {
  userId?: string;
}

export const useResonanceGoals = (props?: UseResonanceGoalsProps) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  // Fetch Categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[], Error>({
    queryKey: ['resonanceCategories', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch Goals
  const { data: goals = [], isLoading: goalsLoading, error: goalsError } = useQuery<Goal[], Error>({
    queryKey: ['resonanceGoals', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    if (categoriesError || goalsError) {
      console.error('Error fetching resonance goals data:', categoriesError?.message || goalsError?.message);
      showError('Failed to load resonance goals data.');
    }
  }, [categoriesError, goalsError]);

  const goalsWithCategoryInfo = useMemo(() => {
    if (goalsLoading || categoriesLoading) return [];
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    return goals.map(goal => {
      const category = goal.category_id ? categoryMap.get(goal.category_id) : undefined;
      return {
        ...goal,
        category_name: category?.name || 'Uncategorized',
        category_color: category?.color || '#6b7280', // Default gray
      };
    });
  }, [goals, categories, goalsLoading, categoriesLoading]);

  const addGoalMutation = useMutation<Goal, Error, NewGoalData>({
    mutationFn: async (newGoal) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...newGoal, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Goal added successfully!');
      queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] });
    },
    onError: (err) => {
      console.error('useResonanceGoals: Error adding goal:', err.message);
      showError('Failed to add goal.');
    },
  });

  const updateGoalMutation = useMutation<Goal, Error, { id: string; updates: UpdateGoalData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      console.log('Attempting to update goal:', { id, updates }); // Add this log
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) {
        console.error('Supabase update error:', error); // Log Supabase specific error
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      showSuccess('Goal updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] });
    },
    onError: (err) => {
      console.error('useResonanceGoals: Error updating goal:', err.message);
      showError('Failed to update goal.');
    },
  });

  const deleteGoalMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      // Delete the goal and any sub-goals associated with it
      const { error } = await supabase
        .from('goals')
        .delete()
        .or(`id.eq.${id},parent_goal_id.eq.${id}`) // Delete the goal itself OR any goals where this is the parent
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Goal deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] });
    },
    onError: (err) => {
      console.error('useResonanceGoals: Error deleting goal:', err.message);
      showError('Failed to delete goal.');
    },
  });

  const addCategoryMutation = useMutation<Category, Error, { name: string; color: string }>({
    mutationFn: async ({ name, color }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, color, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Category added successfully!');
      queryClient.invalidateQueries({ queryKey: ['resonanceCategories', userId] });
    },
    onError: (err) => {
      console.error('useResonanceGoals: Error adding category:', err.message);
      showError('Failed to add category.');
    },
  });

  const updateCategoryMutation = useMutation<Category, Error, { id: string; updates: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>> }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Category updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['resonanceCategories', userId] });
      queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] }); // Goals might need category info updated
    },
    onError: (err) => {
      console.error('useResonanceGoals: Error updating category:', err.message);
      showError('Failed to update category.');
    },
  });

  const deleteCategoryMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      // First, set category_id to null for all goals associated with this category
      await supabase
        .from('goals')
        .update({ category_id: null })
        .eq('category_id', id)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Category deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['resonanceCategories', userId] });
      queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] }); // Goals might need category info updated
    },
    onError: (err) => {
      console.error('useResonanceGoals: Error deleting category:', err.message);
      showError('Failed to delete category.');
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const goalsChannel = supabase
      .channel('goals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] });
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['resonanceCategories', userId] });
          queryClient.invalidateQueries({ queryKey: ['resonanceGoals', userId] }); // Goals might need category info updated
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [userId, queryClient]);

  return {
    goals: goalsWithCategoryInfo,
    categories,
    loading: goalsLoading || categoriesLoading,
    addGoal: addGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    addCategory: addCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
  };
};