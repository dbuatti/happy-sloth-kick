import { useAuth } from '@/context/AuthContext';
import { CustomCard, WeeklyFocus, NewCustomCardData, UpdateCustomCardData, UpdateWeeklyFocusData, Json, UserSettings } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { startOfWeek, format } from 'date-fns';

interface UseDashboardDataProps {
  userId?: string;
}

export const useDashboardData = ({ userId: propUserId }: UseDashboardDataProps) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: customCards, isLoading: isLoadingCards, error: cardsError } = useQuery<CustomCard[], Error>({
    queryKey: ['customCards', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .select('*')
        .eq('user_id', currentUserId)
        .order('card_order', { ascending: true });

      if (error) throw error;
      return data as CustomCard[];
    },
    enabled: !!currentUserId,
  });

  const { data: weeklyFocus, isLoading: isLoadingWeeklyFocus, error: weeklyFocusError } = useQuery<WeeklyFocus, Error>({
    queryKey: ['weeklyFocus', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('User not authenticated');
      const startOfCurrentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('week_start_date', startOfCurrentWeek)
        .single();

      if (error) {
        // If no weekly focus exists for the current week, create a new one
        const { data: newFocus, error: insertError } = await supabase
          .from('weekly_focus')
          .insert({ user_id: currentUserId, week_start_date: startOfCurrentWeek })
          .select()
          .single();
        if (insertError) throw insertError;
        return newFocus as WeeklyFocus;
      }
      return data as WeeklyFocus;
    },
    enabled: !!currentUserId,
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
      return data as CustomCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
    },
  });

  const updateCustomCardMutation = useMutation<CustomCard, Error, { id: string; updates: UpdateCustomCardData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as CustomCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
    },
  });

  const deleteCustomCardMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('custom_dashboard_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCards', currentUserId] });
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
        .select()
        .single();

      if (error) throw error;
      return data as WeeklyFocus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyFocus', currentUserId] });
    },
  });

  const updateDashboardLayoutMutation = useMutation<UserSettings, Error, Json, unknown>({
    mutationFn: async (newLayout) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('user_settings')
        .update({ dashboard_layout: newLayout })
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['userSettings', currentUserId], updatedSettings);
    },
  });

  const updateDashboardLayout = async (newLayout: Json) => {
    try {
      await updateDashboardLayoutMutation.mutateAsync(newLayout);
      toast.success('Dashboard layout saved!');
    } catch (error) {
      toast.error('Failed to save dashboard layout.');
      console.error('Error updating dashboard layout:', error);
    }
  };

  return {
    customCards: customCards || [],
    isLoadingCards,
    cardsError,
    addCustomCard: addCustomCardMutation.mutateAsync,
    updateCustomCard: updateCustomCardMutation.mutateAsync,
    deleteCustomCard: deleteCustomCardMutation.mutateAsync,
    weeklyFocus,
    isLoadingWeeklyFocus,
    weeklyFocusError,
    updateWeeklyFocus: updateWeeklyFocusMutation.mutateAsync,
    updateDashboardLayout,
  };
};