import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CustomCard,
  WeeklyFocus,
  NewCustomCardData,
  UpdateCustomCardData,
  UpdateWeeklyFocusData,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { toast } from 'react-hot-toast';

export const useDashboardData = (userId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = userId || user?.id;
  const queryClient = useQueryClient();

  const { data: customCards, isLoading: cardsLoading, error: cardsError } = useQuery<CustomCard[], Error>({
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

  const { data: weeklyFocus, isLoading: weeklyFocusLoading, error: weeklyFocusError } = useQuery<WeeklyFocus | null, Error>({
    queryKey: ['weeklyFocus', currentUserId, format(startOfWeek(new Date()), 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!currentUserId) return null;
      const startOfCurrentWeek = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('week_start_date', startOfCurrentWeek)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addCustomCardMutation = useMutation<CustomCard, Error, NewCustomCardData, unknown>({
    mutationFn: async (newCardData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .insert({ ...newCardData, user_id: currentUserId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
      toast.success('Card added!');
    },
  });

  const updateCustomCardMutation = useMutation<CustomCard, Error, { id: string; updates: UpdateCustomCardData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
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
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
      toast.success('Card updated!');
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
      toast.success('Card deleted!');
    },
  });

  const updateWeeklyFocusMutation = useMutation<WeeklyFocus, Error, UpdateWeeklyFocusData, unknown>({
    mutationFn: async (updates) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const startOfCurrentWeek = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('weekly_focus')
        .upsert({ ...updates, user_id: currentUserId, week_start_date: startOfCurrentWeek }, { onConflict: 'user_id, week_start_date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyFocus', currentUserId] });
      toast.success('Weekly focus updated!');
    },
  });

  const updateCardOrderMutation = useMutation<void, Error, { updates: { id: string; card_order: number }[] }, unknown>({
    mutationFn: async ({ updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase.from('custom_dashboard_cards').upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
    },
  });

  const addCustomCard = useCallback(async (newCardData: NewCustomCardData) => {
    return addCustomCardMutation.mutateAsync(newCardData);
  }, [addCustomCardMutation]);

  const updateCustomCard = useCallback(async (id: string, updates: UpdateCustomCardData) => {
    return updateCustomCardMutation.mutateAsync({ id, updates });
  }, [updateCustomCardMutation]);

  const deleteCustomCard = useCallback(async (id: string) => {
    return deleteCustomCardMutation.mutateAsync(id);
  }, [deleteCustomCardMutation]);

  const updateWeeklyFocus = useCallback(async (updates: UpdateWeeklyFocusData) => {
    return updateWeeklyFocusMutation.mutateAsync(updates);
  }, [updateWeeklyFocusMutation]);

  const updateCardOrder = useCallback(async (updates: { id: string; card_order: number }[]) => {
    return updateCardOrderMutation.mutateAsync({ updates });
  }, [updateCardOrderMutation]);

  return {
    customCards,
    weeklyFocus,
    isLoading: cardsLoading || weeklyFocusLoading || authLoading,
    error: cardsError || weeklyFocusError,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    updateWeeklyFocus,
    updateCardOrder,
  };
};