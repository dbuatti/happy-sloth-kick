import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { CustomCard, WeeklyFocus, NewCustomCardData, UpdateCustomCardData, UpdateWeeklyFocusData, Json } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { toast } from 'react-hot-toast';

export const useDashboardData = (isDemo = false, demoUserId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const queryClient = useQueryClient();

  const { data: customCards, isLoading: customCardsLoading, error: customCardsError } = useQuery<CustomCard[], Error>({
    queryKey: ['customCards', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .select('*')
        .eq('user_id', currentUserId)
        .order('card_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const { data: weeklyFocus, isLoading: weeklyFocusLoading, error: weeklyFocusError } = useQuery<WeeklyFocus, Error>({
    queryKey: ['weeklyFocus', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { id: '', user_id: '', week_start_date: '', primary_focus: null, secondary_focus: null, tertiary_focus: null, created_at: null, updated_at: null }; // Default empty focus
      const startOfCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('week_start_date', startOfCurrentWeek)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine for initial load
        throw error;
      }

      if (!data) {
        const { data: newFocus, error: insertError } = await supabase
          .from('weekly_focus')
          .insert({ user_id: currentUserId, week_start_date: startOfCurrentWeek })
          .select('*')
          .single();
        if (insertError) throw insertError;
        return newFocus;
      }
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addCustomCardMutation = useMutation<CustomCard, Error, NewCustomCardData, unknown>({
    mutationFn: async (newCardData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .insert({ ...newCardData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
      toast.success('Custom card added!');
    },
  });

  const updateCustomCardMutation = useMutation<CustomCard, Error, { id: string; updates: UpdateCustomCardData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
      toast.success('Custom card updated!');
    },
  });

  const deleteCustomCardMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('custom_dashboard_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
      toast.success('Custom card deleted!');
    },
  });

  const updateWeeklyFocusMutation = useMutation<WeeklyFocus, Error, UpdateWeeklyFocusData, unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const startOfCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('weekly_focus')
        .update(updates)
        .eq('user_id', currentUserId)
        .eq('week_start_date', startOfCurrentWeek)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyFocus', currentUserId] });
      toast.success('Weekly focus updated!');
    },
  });

  const updateDashboardLayout = useCallback(async (newLayout: Json) => {
    if (!currentUserId) return;
    await supabase
      .from('user_settings')
      .update({ dashboard_layout: newLayout })
      .eq('user_id', currentUserId);
    queryClient.invalidateQueries({ queryKey: ['userSettings', currentUserId] });
  }, [currentUserId, queryClient]);

  return {
    customCards,
    weeklyFocus,
    isLoading: customCardsLoading || weeklyFocusLoading,
    error: customCardsError || weeklyFocusError,
    addCustomCard: addCustomCardMutation.mutateAsync,
    updateCustomCard: updateCustomCardMutation.mutateAsync,
    deleteCustomCard: deleteCustomCardMutation.mutateAsync,
    updateWeeklyFocus: updateWeeklyFocusMutation.mutateAsync,
    updateDashboardLayout,
  };
};