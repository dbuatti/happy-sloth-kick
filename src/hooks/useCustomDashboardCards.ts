import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

export interface CustomDashboardCard {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  emoji: string | null;
  card_order: number | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string | null;
}

export type NewCustomCardData = Omit<CustomDashboardCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type UpdateCustomCardData = Partial<Omit<CustomDashboardCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

interface UseCustomDashboardCardsOptions {
  userId?: string;
}

export const useCustomDashboardCards = ({ userId: propUserId }: UseCustomDashboardCardsOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = propUserId || user?.id;

  const [customCards, setCustomCards] = useState<CustomDashboardCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomCards = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .select('*')
        .eq('user_id', userId)
        .order('card_order', { ascending: true });

      if (error) throw error;
      setCustomCards(data);
    } catch (err: any) {
      console.error('Error fetching custom cards:', err.message);
      setError(err.message);
      showError('Failed to fetch custom cards.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCustomCards();
  }, [fetchCustomCards]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:custom_dashboard_cards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_dashboard_cards', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setCustomCards(prev => [...prev, payload.new as CustomDashboardCard].sort((a, b) => (a.card_order || 0) - (b.card_order || 0)));
        } else if (payload.eventType === 'UPDATE') {
          setCustomCards(prev => prev.map(card => (card.id === payload.old.id ? payload.new as CustomDashboardCard : card)).sort((a, b) => (a.card_order || 0) - (b.card_order || 0)));
        } else if (payload.eventType === 'DELETE') {
          setCustomCards(prev => prev.filter(card => card.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createCustomCard = async (newCard: NewCustomCardData): Promise<CustomDashboardCard | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .insert({ ...newCard, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      showSuccess('Custom card created successfully!');
      queryClient.invalidateQueries({ queryKey: ['custom_dashboard_cards', userId] });
      return data;
    } catch (err: any) {
      console.error('Error creating custom card:', err.message);
      showError(`Failed to create custom card: ${err.message}`);
      return null;
    }
  };

  const updateCustomCard = async (cardId: string, updates: UpdateCustomCardData): Promise<CustomDashboardCard | null> => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('custom_dashboard_cards')
        .update(updates)
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      showSuccess('Custom card updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['custom_dashboard_cards', userId] });
      return data;
    } catch (err: any) {
      console.error('Error updating custom card:', err.message);
      showError(`Failed to update custom card: ${err.message}`);
      return null;
    }
  };

  const deleteCustomCard = async (cardId: string): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('custom_dashboard_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess('Custom card deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['custom_dashboard_cards', userId] });
      return true;
    } catch (err: any) {
      console.error('Error deleting custom card:', err.message);
      showError(`Failed to delete custom card: ${err.message}`);
      return false;
    }
  };

  const reorderCustomCards = async (orderedCardIds: string[]): Promise<boolean> => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const updates = orderedCardIds.map((id, index) => ({
        id,
        card_order: index,
      }));

      const { error } = await supabase
        .from('custom_dashboard_cards')
        .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

      if (error) throw error;
      showSuccess('Custom cards reordered successfully!');
      queryClient.invalidateQueries({ queryKey: ['custom_dashboard_cards', userId] });
      return true;
    } catch (err: any) {
      console.error('Error reordering custom cards:', err.message);
      showError(`Failed to reorder custom cards: ${err.message}`);
      return false;
    }
  };

  return {
    customCards,
    isLoading,
    error,
    createCustomCard,
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards,
  };
};