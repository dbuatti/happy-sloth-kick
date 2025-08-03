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
  support_link: string | null;
  meditation_notes: string | null;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocus | null>(null);
  const [customCards, setCustomCards] = useState<CustomCard[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>({ support_link: null, meditation_notes: null });
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
        .single();

      if (focusError && focusError.code === 'PGRST116') {
        const { data: newFocus, error: insertError } = await supabase
          .from('weekly_focus')
          .insert({ user_id: userId, week_start_date: weekStartDate })
          .select()
          .single();
        if (insertError) throw insertError;
        focusData = newFocus;
      } else if (focusError) {
        throw focusError;
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
        .select('support_link, meditation_notes')
        .eq('user_id', userId)
        .single();
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (settingsData) {
        setSettings({
          support_link: settingsData.support_link,
          meditation_notes: settingsData.meditation_notes,
        });
      }

    } catch (error: any) {
      showError('Failed to load dashboard data.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId, weekStartDate]);

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
  };
};