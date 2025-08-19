import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { startOfWeek, format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface WeeklyFocus {
  id: string;
  user_id: string;
  week_start_date: string;
  primary_focus: string | null;
  secondary_focus: string | null;
  tertiary_focus: string | null;
}

export interface CustomCard {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  emoji: string | null;
  card_order: number | null;
  is_visible: boolean;
}

export interface DashboardSettings {
  meditation_notes: string | null;
  dashboard_layout: { [key: string]: boolean } | null;
}

const defaultLayout = {
  dailyScheduleVisible: true,
  weeklyFocusVisible: true,
  peopleMemoryVisible: true,
  meditationNotesVisible: true,
  dailyBriefingVisible: true, // New setting for daily briefing card
};

export const useDashboardData = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const isDemo = !!props?.userId;
  const queryClient = useQueryClient();

  const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch Weekly Focus
  const { data: weeklyFocus = null, isLoading: weeklyFocusLoading, error: weeklyFocusError } = useQuery<WeeklyFocus | null, Error>({
    queryKey: ['weeklyFocus', userId, weekStartDate],
    queryFn: async () => {
      if (!userId) return null;
      let { data, error } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      if (error) throw error;

      if (!data && !isDemo) {
        const { data: newFocus, error: insertError } = await supabase
          .from('weekly_focus')
          .insert({ user_id: userId, week_start_date: weekStartDate })
          .select()
          .single();
        if (insertError) {
          if (insertError.code === '23505') { // unique_violation, handle race condition
            const { data: refetchedFocus, error: refetchError } = await supabase
              .from('weekly_focus')
              .select('*')
              .eq('user_id', userId)
              .eq('week_start_date', weekStartDate)
              .single();
            if (refetchError) throw refetchError;
            data = refetchedFocus;
          } else {
            throw insertError;
          }
        } else {
          data = newFocus;
        }
      }
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch Custom Cards
  const { data: customCards = [], isLoading: customCardsLoading, error: customCardsError } = useQuery<CustomCard[], Error>({
    queryKey: ['customCards', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .select('*')
        .eq('user_id', userId)
        .order('card_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch User Settings (for dashboard layout and meditation notes)
  const { data: settings = { meditation_notes: null, dashboard_layout: defaultLayout }, isLoading: settingsLoading, error: settingsError } = useQuery<DashboardSettings, Error>({
    queryKey: ['userSettings', userId],
    queryFn: async () => {
      if (!userId) return { meditation_notes: null, dashboard_layout: defaultLayout };
      const { data, error } = await supabase
        .from('user_settings')
        .select('meditation_notes, dashboard_layout')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return {
        meditation_notes: data?.meditation_notes || null,
        dashboard_layout: { ...defaultLayout, ...(data?.dashboard_layout || {}) },
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loading = weeklyFocusLoading || customCardsLoading || settingsLoading;

  useEffect(() => {
    if (weeklyFocusError || customCardsError || settingsError) {
      console.error('Error fetching dashboard data:', weeklyFocusError || customCardsError || settingsError);
      showError('Failed to load dashboard data.');
    }
  }, [weeklyFocusError, customCardsError, settingsError]);

  const updateWeeklyFocusMutation = useMutation<WeeklyFocus, Error, Partial<Omit<WeeklyFocus, 'id' | 'user_id' | 'week_start_date'>>>({
    mutationFn: async (updates) => {
      if (!userId || !weeklyFocus) throw new Error('User not authenticated or weekly focus not loaded.');
      const { data, error } = await supabase
        .from('weekly_focus')
        .update(updates)
        .eq('id', weeklyFocus.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Weekly focus updated!');
      queryClient.invalidateQueries({ queryKey: ['weeklyFocus', userId, weekStartDate] });
    },
    onError: (err) => {
      showError('Failed to update weekly focus.');
      console.error(err);
    },
  });

  const addCustomCardMutation = useMutation<CustomCard, Error, Omit<CustomCard, 'id' | 'user_id' | 'is_visible'>>({
    mutationFn: async (card) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .insert({ ...card, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Card added!');
      queryClient.invalidateQueries({ queryKey: ['customCards', userId] });
    },
    onError: (err) => {
      showError('Failed to add card.');
      console.error(err);
    },
  });

  const updateCustomCardMutation = useMutation<CustomCard, Error, { id: string; updates: Partial<Omit<CustomCard, 'id' | 'user_id'>> }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Card updated!');
      queryClient.invalidateQueries({ queryKey: ['customCards', userId] });
    },
    onError: (err) => {
      showError('Failed to update card.');
      console.error(err);
    },
  });

  const deleteCustomCardMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('custom_dashboard_cards').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Card deleted!');
      queryClient.invalidateQueries({ queryKey: ['customCards', userId] });
    },
    onError: (err) => {
      showError('Failed to delete card.');
      console.error(err);
    },
  });

  const reorderCustomCardsMutation = useMutation<boolean, Error, string[]>({
    mutationFn: async (orderedCardIds) => {
      if (!userId) throw new Error('User not authenticated.');
      const updates = orderedCardIds.map((id, index) => ({
        id,
        card_order: index,
        user_id: userId,
      }));

      const { error } = await supabase
        .from('custom_dashboard_cards')
        .upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Cards reordered!');
      queryClient.invalidateQueries({ queryKey: ['customCards', userId] });
    },
    onError: (err) => {
      showError('Failed to reorder cards.');
      console.error('Error reordering custom cards:', err.message);
    },
  });

  return {
    loading,
    weeklyFocus,
    customCards,
    settings,
    updateWeeklyFocus: updateWeeklyFocusMutation.mutateAsync,
    addCustomCard: addCustomCardMutation.mutateAsync,
    updateCustomCard: updateCustomCardMutation.mutateAsync,
    deleteCustomCard: deleteCustomCardMutation.mutateAsync,
    reorderCustomCards: reorderCustomCardsMutation.mutateAsync,
  };
};