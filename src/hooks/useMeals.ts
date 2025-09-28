import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format, isPast, setHours, setMinutes, parseISO, addHours } from 'date-fns';
import { Meal, MealType, NewMealData, UpdateMealData } from '@/types/meals'; // Updated import path

const MEAL_TIMES: Record<MealType, { hour: number; minute: number }> = {
  breakfast: { hour: 7, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 0 },
};

const MAX_DAYS_TO_FETCH = 7; // Fetch meals for up to 7 days into the future (21 meals total)

// Helper to generate a list of upcoming meal slots
const generateUpcomingMealSlots = (currentDate: Date, existingMeals: Meal[], daysToGenerate: number): Meal[] => {
  const slots: Meal[] = [];
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()); // Normalize to start of day

  for (let i = 0; i < daysToGenerate; i++) {
    const date = addDays(today, i);
    const formattedDate = format(date, 'yyyy-MM-dd');

    (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach(mealType => {
      const existingMeal = existingMeals.find(
        m => m.meal_date === formattedDate && m.meal_type === mealType
      );

      if (existingMeal) {
        slots.push(existingMeal);
      } else {
        // Create a placeholder meal slot
        slots.push({
          id: `placeholder-${formattedDate}-${mealType}`, // Unique ID for placeholders
          user_id: '', // Will be filled by the hook
          meal_date: formattedDate,
          meal_type: mealType,
          name: '',
          notes: null,
          has_ingredients: false,
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });
  }
  return slots;
};

interface UseMealsProps {
  userId?: string;
  visibleMealCount?: number; // New prop for controlling visible meals
}

export const useMeals = (props?: UseMealsProps) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const visibleMealCount = props?.visibleMealCount ?? (3 * 3); // Default to 9 meals (3 days)
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch all meals for the user (we'll filter and manage the window client-side)
  const { data: allMeals = [], isLoading: loading, error } = useQuery<Meal[], Error>({
    queryKey: ['meals', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .order('meal_date', { ascending: true })
        .order('meal_type', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching meals:', error.message);
      showError('Failed to load meal plans.');
    }
  }, [error]);

  // Memoize the upcoming meals based on current date, all fetched meals, and visibleMealCount
  const upcomingMeals = useMemo(() => {
    let generatedSlots = generateUpcomingMealSlots(currentDate, allMeals, MAX_DAYS_TO_FETCH);

    // Filter out meals that are completed AND 2 hours past their time
    const filteredSlots = generatedSlots.filter(meal => {
      if (!meal.is_completed) return true;

      const mealTime = MEAL_TIMES[meal.meal_type];
      const mealDateTime = setMinutes(setHours(parseISO(meal.meal_date), mealTime.hour), mealTime.minute);
      const twoHoursPastMealTime = addHours(mealDateTime, 2);

      return !isPast(twoHoursPastMealTime);
    });

    return filteredSlots.slice(0, visibleMealCount);
  }, [currentDate, allMeals, visibleMealCount]);

  // Periodically update currentDate to trigger re-evaluation of upcomingMeals
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000 * 60); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const addMealMutation = useMutation<Meal, Error, NewMealData>({
    mutationFn: async (newMeal) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('meals')
        .insert({ ...newMeal, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Meal added successfully!');
      queryClient.invalidateQueries({ queryKey: ['meals', userId] });
    },
    onError: (err) => {
      console.error('useMeals: Error adding meal:', err.message);
      showError('Failed to add meal.');
    },
  });

  const updateMealMutation = useMutation<Meal, Error, { id: string; updates: UpdateMealData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Meal updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['meals', userId] });
    },
    onError: (err) => {
      console.error('useMeals: Error updating meal:', err.message);
      showError('Failed to update meal.');
    },
  });

  const deleteMealMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Meal deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['meals', userId] });
    },
    onError: (err) => {
      console.error('useMeals: Error deleting meal:', err.message);
      showError('Failed to delete meal.');
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('meals-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['meals', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    upcomingMeals,
    loading,
    addMeal: addMealMutation.mutateAsync,
    updateMeal: updateMealMutation.mutateAsync,
    deleteMeal: deleteMealMutation.mutateAsync,
    currentDate, // Expose currentDate for display purposes
  };
};