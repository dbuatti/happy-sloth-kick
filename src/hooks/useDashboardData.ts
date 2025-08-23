import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CustomCard, WeeklyFocus, NewCustomCardData, UpdateCustomCardData, UpdateWeeklyFocusData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const defaultDashboardLayout = {
  lg: [
    { i: 'welcome-card', x: 0, y: 0, w: 6, h: 2 },
    { i: 'weekly-focus', x: 6, y: 0, w: 6, h: 2 },
    { i: 'daily-schedule-preview', x: 0, y: 2, w: 6, h: 4 },
    { i: 'next-task', x: 6, y: 2, w: 3, h: 2 },
    { i: 'quick-links', x: 9, y: 2, w: 3, h: 2 },
    { i: 'people-memory', x: 6, y: 4, w: 6, h: 2 },
    { i: 'meditation-notes', x: 0, y: 6, w: 6, h: 2 },
    { i: 'gratitude-journal', x: 6, y: 6, w: 3, h: 2 },
    { i: 'worry-journal', x: 9, y: 6, w: 3, h: 2 },
  ],
  md: [
    { i: 'welcome-card', x: 0, y: 0, w: 4, h: 2 },
    { i: 'weekly-focus', x: 4, y: 0, w: 4, h: 2 },
    { i: 'daily-schedule-preview', x: 0, y: 2, w: 4, h: 4 },
    { i: 'next-task', x: 4, y: 2, w: 4, h: 2 },
    { i: 'quick-links', x: 0, y: 6, w: 4, h: 2 },
    { i: 'people-memory', x: 4, y: 4, w: 4, h: 2 },
    { i: 'meditation-notes', x: 0, y: 8, w: 4, h: 2 },
    { i: 'gratitude-journal', x: 4, y: 6, w: 4, h: 2 },
    { i: 'worry-journal', x: 0, y: 10, w: 4, h: 2 },
  ],
};

export const useDashboardData = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateDashboardQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customCards', userId] });
    queryClient.invalidateQueries({ queryKey: ['weeklyFocus', userId] });
  }, [queryClient, userId]);

  // Fetch Custom Cards
  const { data: customCards, isLoading: customCardsLoading, error: customCardsError } = useQuery<CustomCard[], Error>({
    queryKey: ['customCards', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .select('*')
        .eq('user_id', userId)
        .order('card_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  // Add Custom Card
  const addCustomCardMutation = useMutation<CustomCard, Error, NewCustomCardData, unknown>({
    mutationFn: async (newCardData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .insert({ ...newCardData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDashboardQueries();
    },
  });

  // Update Custom Card
  const updateCustomCardMutation = useMutation<CustomCard, Error, { id: string; updates: UpdateCustomCardData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDashboardQueries();
    },
  });

  // Delete Custom Card
  const deleteCustomCardMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('custom_dashboard_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDashboardQueries();
    },
  });

  // Fetch Weekly Focus
  const { data: weeklyFocus, isLoading: weeklyFocusLoading, error: weeklyFocusError } = useQuery<WeeklyFocus, Error>({
    queryKey: ['weeklyFocus', userId, format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');
      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const { data, error } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', format(startOfCurrentWeek, 'yyyy-MM-dd'))
        .single();

      if (error && error.code === 'PGRST116') { // No rows found
        // Insert a new entry for the current week
        const { data: newFocus, error: insertError } = await supabase
          .from('weekly_focus')
          .insert({
            user_id: userId,
            week_start_date: format(startOfCurrentWeek, 'yyyy-MM-dd'),
            primary_focus: null,
            secondary_focus: null,
            tertiary_focus: null,
          })
          .select('*')
          .single();
        if (insertError) throw insertError;
        return newFocus;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  // Update Weekly Focus
  const updateWeeklyFocusMutation = useMutation<WeeklyFocus, Error, UpdateWeeklyFocusData, unknown>({
    mutationFn: async (updates) => {
      if (!userId) throw new Error('User not authenticated');
      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
      const { data, error } = await supabase
        .from('weekly_focus')
        .update(updates)
        .eq('user_id', userId)
        .eq('week_start_date', format(startOfCurrentWeek, 'yyyy-MM-dd'))
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDashboardQueries();
    },
  });

  return {
    customCards,
    weeklyFocus,
    isLoading: customCardsLoading || weeklyFocusLoading || authLoading,
    error: customCardsError || weeklyFocusError,
    addCustomCard: addCustomCardMutation.mutateAsync,
    updateCustomCard: updateCustomCardMutation.mutateAsync,
    deleteCustomCard: deleteCustomCardMutation.mutateAsync,
    updateWeeklyFocus: updateWeeklyFocusMutation.mutateAsync,
    defaultDashboardLayout,
  };
};