import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchCustomDashboardCards,
  upsertCustomDashboardCard,
  deleteCustomDashboardCard,
} from '@/integrations/supabase/api';
import { CustomDashboardCard } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseCustomDashboardCardsProps {
  userId?: string | null;
}

export const useCustomDashboardCards = (props?: UseCustomDashboardCardsProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const cardsQueryKey = ['customDashboardCards', activeUserId];

  const {
    data: customDashboardCards = [],
    isLoading,
    error,
  } = useQuery<CustomDashboardCard[], Error>({
    queryKey: cardsQueryKey,
    queryFn: () => fetchCustomDashboardCards(activeUserId!),
    enabled: !!activeUserId,
  });

  const upsertCardMutation = useMutation<CustomDashboardCard | null, Error, Partial<CustomDashboardCard>>({
    mutationFn: (cardData) => upsertCustomDashboardCard(cardData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to save card: ${err.message}`);
    },
  });

  const deleteCardMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteCustomDashboardCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete card: ${err.message}`);
    },
  });

  const addCustomDashboardCard = useCallback(
    async (title: string, content: string | null, emoji: string | null): Promise<CustomDashboardCard | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newCard: Partial<CustomDashboardCard> = {
          user_id: activeUserId,
          title,
          content,
          emoji,
          card_order: customDashboardCards.length,
          is_visible: true,
        };
        const result = await upsertCardMutation.mutateAsync(newCard);
        showSuccess('Custom card added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, customDashboardCards.length, upsertCardMutation]
  );

  const updateCustomDashboardCard = useCallback(
    async (cardId: string, updates: Partial<CustomDashboardCard>): Promise<CustomDashboardCard | null> => {
      try {
        const result = await upsertCardMutation.mutateAsync({ id: cardId, ...updates });
        showSuccess('Custom card updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [upsertCardMutation]
  );

  const deleteCustomDashboardCardCallback = useCallback(
    async (cardId: string): Promise<void> => {
      try {
        await deleteCardMutation.mutateAsync(cardId);
        showSuccess('Custom card deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteCardMutation]
  );

  return {
    customDashboardCards,
    isLoading,
    error,
    addCustomDashboardCard,
    updateCustomDashboardCard,
    deleteCustomDashboardCard: deleteCustomDashboardCardCallback,
  };
};