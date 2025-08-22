import { useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  fetchQuickLinks,
  addQuickLink,
  updateQuickLink,
  deleteQuickLink,
} from '@/integrations/supabase/api';
import { QuickLink } from '@/types/task';
import { showError, showSuccess } from '@/utils/toast';

interface UseQuickLinksProps {
  userId?: string | null;
}

interface NewQuickLinkData {
  title: string;
  url: string;
  image_url: string | null;
  link_order: number | null;
  emoji: string | null;
  background_color: string | null;
  avatar_text: string | null;
  user_id: string;
}

export const useQuickLinks = (props?: UseQuickLinksProps) => {
  const { user } = useAuth();
  const activeUserId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const linksQueryKey = ['quickLinks', activeUserId];

  const {
    data: quickLinks = [],
    isLoading,
    error,
  } = useQuery<QuickLink[], Error>({
    queryKey: linksQueryKey,
    queryFn: () => fetchQuickLinks(activeUserId!),
    enabled: !!activeUserId,
  });

  const addLinkMutation = useMutation<QuickLink | null, Error, NewQuickLinkData>({
    mutationFn: (newLink) => addQuickLink(newLink),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to add link: ${err.message}`);
    },
  });

  const updateLinkMutation = useMutation<QuickLink | null, Error, { id: string; updates: Partial<NewQuickLinkData> }>({
    mutationFn: ({ id, updates }) => updateQuickLink(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to update link: ${err.message}`);
    },
  });

  const deleteLinkMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteQuickLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
    onError: (err) => {
      showError(`Failed to delete link: ${err.message}`);
    },
  });

  const addQuickLinkCallback = useCallback(
    async (title: string, url: string, emoji: string | null, backgroundColor: string | null): Promise<QuickLink | null> => {
      if (!activeUserId) {
        showError('User not authenticated.');
        return null;
      }
      try {
        const newLinkData: NewQuickLinkData = {
          user_id: activeUserId,
          title,
          url,
          image_url: null,
          link_order: quickLinks.length,
          emoji,
          background_color: backgroundColor,
          avatar_text: null,
        };
        const result = await addLinkMutation.mutateAsync(newLinkData);
        showSuccess('Quick link added successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [activeUserId, quickLinks.length, addLinkMutation]
  );

  const updateQuickLinkCallback = useCallback(
    async (linkId: string, updates: Partial<QuickLink>): Promise<QuickLink | null> => {
      try {
        const result = await updateLinkMutation.mutateAsync({ id: linkId, updates: updates as Partial<NewQuickLinkData> });
        showSuccess('Quick link updated successfully!');
        return result;
      } catch (err) {
        return null;
      }
    },
    [updateLinkMutation]
  );

  const deleteQuickLinkCallback = useCallback(
    async (linkId: string): Promise<void> => {
      try {
        await deleteLinkMutation.mutateAsync(linkId);
        showSuccess('Quick link deleted successfully!');
      } catch (err) {
        // Error handled by mutation's onError
      }
    },
    [deleteLinkMutation]
  );

  return {
    quickLinks,
    isLoading,
    error,
    addQuickLink: addQuickLinkCallback,
    updateQuickLink: updateQuickLinkCallback,
    deleteQuickLink: deleteQuickLinkCallback,
  };
};