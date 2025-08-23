import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UserSettings, WeeklyFocus, CustomCard, Json, NewCustomCardData, UpdateCustomCardData, UpdateWeeklyFocusData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const defaultDashboardLayout = {
  lg: [
    { i: 'welcome', x: 0, y: 0, w: 6, h: 2 },
    { i: 'daily-schedule', x: 6, y: 0, w: 6, h: 2 },
    { i: 'weekly-focus', x: 0, y: 2, w: 12, h: 1 },
    { i: 'quick-links', x: 0, y: 3, w: 6, h: 2 },
    { i: 'people-memory', x: 6, y: 3, w: 6, h: 2 },
  ],
  md: [
    { i: 'welcome', x: 0, y: 0, w: 6, h: 2 },
    { i: 'daily-schedule', x: 6, y: 0, w: 6, h: 2 },
    { i: 'weekly-focus', x: 0, y: 2, w: 12, h: 1 },
    { i: 'quick-links', x: 0, y: 3, w: 6, h: 2 },
    { i: 'people-memory', x: 6, y: 3, w: 6, h: 2 },
  ],
  sm: [
    { i: 'welcome', x: 0, y: 0, w: 4, h: 2 },
    { i: 'daily-schedule', x: 0, y: 2, w: 4, h: 2 },
    { i: 'weekly-focus', x: 0, y: 4, w: 4, h: 1 },
    { i: 'quick-links', x: 0, y: 5, w: 4, h: 2 },
    { i: 'people-memory', x: 0, y: 7, w: 4, h: 2 },
  ],
};

// --- Weekly Focus ---
const fetchWeeklyFocus = async (userId: string, weekStartDate: string): Promise<WeeklyFocus | null> => {
  let { data, error } = await supabase
    .from('weekly_focus')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    throw error;
  }

  if (!data) {
    // If no weekly focus exists for the current week, create one
    const { data: newFocus, error: insertError } = await supabase
      .from('weekly_focus')
      .insert({ user_id: userId, week_start_date: weekStartDate })
      .select('*')
      .single();
    if (insertError) throw insertError;
    return newFocus as WeeklyFocus;
  }
  return data as WeeklyFocus;
};

// --- Custom Dashboard Cards ---
const fetchCustomCards = async (userId: string): Promise<CustomCard[]> => {
  const { data, error } = await supabase
    .from('custom_dashboard_cards')
    .select('*')
    .eq('user_id', userId)
    .order('card_order', { ascending: true });
  if (error) throw error;
  return data as CustomCard[];
};

const addCustomCard = async (newCard: NewCustomCardData & { user_id: string }): Promise<CustomCard> => {
  const { data, error } = await supabase
    .from('custom_dashboard_cards')
    .insert(newCard)
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomCard;
};

const updateCustomCard = async (id: string, updates: UpdateCustomCardData): Promise<CustomCard> => {
  const { data, error } = await supabase
    .from('custom_dashboard_cards')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as CustomCard;
};

const deleteCustomCard = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('custom_dashboard_cards')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

const updateCustomCardsOrder = async (updates: { id: string; card_order: number; user_id: string }[]): Promise<void> => {
  const { error } = await supabase
    .from('custom_dashboard_cards')
    .upsert(updates, { onConflict: 'id' });
  if (error) throw error;
};

export const useDashboardData = () => {
  const { userId, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // --- Weekly Focus Query ---
  const { data: weeklyFocus, isLoading: isLoadingWeeklyFocus, error: errorWeeklyFocus } = useQuery<WeeklyFocus | null, Error>({
    queryKey: ['weeklyFocus', userId, weekStartDate],
    queryFn: async () => {
      if (!userId) return null;
      return fetchWeeklyFocus(userId, weekStartDate);
    },
    enabled: !!userId && !authLoading,
  });

  const invalidateWeeklyFocusQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['weeklyFocus', userId] });
  }, [queryClient, userId]);

  const updateWeeklyFocusMutation = useMutation<WeeklyFocus, Error, UpdateWeeklyFocusData>({
    mutationFn: async (updates) => {
      if (!userId || !weeklyFocus) throw new Error('User not authenticated or weekly focus not loaded.');
      const { data, error } = await supabase
        .from('weekly_focus')
        .update(updates)
        .eq('id', weeklyFocus.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as WeeklyFocus;
    },
    onSuccess: invalidateWeeklyFocusQueries,
  });

  // --- Custom Cards Query ---
  const { data: customCards, isLoading: isLoadingCustomCards, error: errorCustomCards } = useQuery<CustomCard[], Error>({
    queryKey: ['customCards', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchCustomCards(userId);
    },
    enabled: !!userId && !authLoading,
  });

  const invalidateCustomCardsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customCards', userId] });
  }, [queryClient, userId]);

  const addCustomCardMutation = useMutation<CustomCard, Error, NewCustomCardData>({
    mutationFn: async (card) => {
      if (!userId) throw new Error('User not authenticated.');
      return addCustomCard({ ...card, user_id: userId });
    },
    onSuccess: invalidateCustomCardsQueries,
  });

  const updateCustomCardMutation = useMutation<CustomCard, Error, { id: string; updates: UpdateCustomCardData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      return updateCustomCard(id, updates);
    },
    onSuccess: invalidateCustomCardsQueries,
  });

  const deleteCustomCardMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteCustomCard(id),
    onSuccess: invalidateCustomCardsQueries,
  });

  const reorderCustomCardsMutation = useMutation<void, Error, string[]>({
    mutationFn: async (cardIds) => {
      if (!userId) throw new Error('User not authenticated.');
      const updates = cardIds.map((id, index) => ({
        id,
        card_order: index,
        user_id: userId,
      }));
      await updateCustomCardsOrder(updates);
    },
    onSuccess: invalidateCustomCardsQueries,
  });

  return {
    weeklyFocus: weeklyFocus,
    customCards: customCards || [],
    isLoading: isLoadingWeeklyFocus || isLoadingCustomCards || authLoading,
    error: errorWeeklyFocus || errorCustomCards,
    updateWeeklyFocus: updateWeeklyFocusMutation.mutateAsync,
    addCustomCard: addCustomCardMutation.mutateAsync,
    updateCustomCard: updateCustomCardMutation.mutateAsync,
    deleteCustomCard: deleteCustomCardMutation.mutateAsync,
    reorderCustomCards: reorderCustomCardsMutation.mutateAsync,
  };
};