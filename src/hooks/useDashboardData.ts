import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { startOfWeek, format } from 'date-fns';

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
};

export const useDashboardData = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const isDemo = !!props?.userId;

  const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus | null>(null);
  const [customCards, setCustomCards] = useState<CustomCard[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>({ meditation_notes: null, dashboard_layout: defaultLayout });
  const [loading, setLoading] = useState(true);

  const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch or create weekly focus
      let { data: focusData, error: focusError } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDate)
        .maybeSingle();

      if (focusError) throw focusError;

      if (!focusData && !isDemo) {
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
            focusData = refetchedFocus;
          } else {
            throw insertError;
          }
        } else {
          focusData = newFocus;
        }
      }
      setWeeklyFocus(focusData);

      // Fetch custom cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('custom_dashboard_cards')
        .select('*')
        .eq('user_id', userId)
        .order('card_order');
      if (cardsError) throw cardsError;
      setCustomCards(cardsData || []);

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('meditation_notes, dashboard_layout')
        .eq('user_id', userId)
        .single();
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (settingsData) {
        setSettings({
          meditation_notes: settingsData.meditation_notes,
          dashboard_layout: { ...defaultLayout, ...(settingsData.dashboard_layout || {}) },
        });
      }

    } catch (error: any) {
      showError('Failed to load dashboard data.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStartDate, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateWeeklyFocus = async (updates: Partial<Omit<WeeklyFocus, 'id' | 'user_id' | 'week_start_date'>>) => {
    if (!userId || !weeklyFocus) return;
    try {
      const { data, error } = await supabase
        .from('weekly_focus')
        .update(updates)
        .eq('id', weeklyFocus.id)
        .select()
        .single();
      if (error) throw error;
      setWeeklyFocus(data);
      showSuccess('Weekly focus updated!');
    } catch (error) {
      showError('Failed to update weekly focus.');
    }
  };

  const updateSettings = async (updates: Partial<DashboardSettings>) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId);
      if (error) throw error;
      setSettings(prev => ({ ...prev, ...updates }));
      showSuccess('Settings updated!');
    } catch (error) {
      showError('Failed to update settings.');
    }
  };

  const addCustomCard = async (card: Omit<CustomCard, 'id' | 'user_id' | 'is_visible'>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .insert({ ...card, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setCustomCards(prev => [...prev, data]);
      showSuccess('Card added!');
    } catch (error) {
      showError('Failed to add card.');
    }
  };

  const updateCustomCard = async (id: string, updates: Partial<Omit<CustomCard, 'id' | 'user_id'>>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setCustomCards(prev => prev.map(c => c.id === id ? data : c));
      showSuccess('Card updated!');
    } catch (error) {
      showError('Failed to update card.');
    }
  };

  const deleteCustomCard = async (id: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from('custom_dashboard_cards').delete().eq('id', id);
      if (error) throw error;
      setCustomCards(prev => prev.filter(c => c.id !== id));
      showSuccess('Card deleted!');
    } catch (error) {
      showError('Failed to delete card.');
    }
  };

  const reorderCustomCards = useCallback(async (orderedCardIds: string[]) => {
    if (!userId) {
      showError('User not authenticated.');
      return;
    }
    const updates = orderedCardIds.map((id, index) => ({
      id,
      card_order: index,
      user_id: userId, // Ensure user_id is included for RLS
    }));

    // Optimistic update
    setCustomCards(prev => {
      const newOrderMap = new Map(updates.map(u => [u.id, u.card_order]));
      return [...prev].sort((a, b) => (newOrderMap.get(a.id) || 0) - (newOrderMap.get(b.id) || 0));
    });

    try {
      const { error } = await supabase
        .from('custom_dashboard_cards')
        .upsert(updates, { onConflict: 'id' }); // Use upsert with onConflict on 'id'
      if (error) throw error;
      showSuccess('Cards reordered!');
    } catch (error: any) {
      showError('Failed to reorder cards.');
      console.error('Error reordering custom cards:', error.message);
      // Revert optimistic update if error occurs
      fetchData(); 
    }
  }, [userId, fetchData]);

  return {
    loading,
    weeklyFocus,
    customCards,
    settings,
    updateWeeklyFocus,
    updateSettings,
    addCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards, // Export the new function
  };
};