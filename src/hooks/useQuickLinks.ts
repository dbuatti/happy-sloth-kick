import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const useQuickLinks = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateQuickLinksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quickLinks', userId] });
  }, [queryClient, userId]);

  const { data: quickLinks, isLoading, error } = useQuery<QuickLink[], Error>({
    queryKey: ['quickLinks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', userId)
        .order('link_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  const addQuickLinkMutation = useMutation<QuickLink, Error, NewQuickLinkData, unknown>({
    mutationFn: async (newLinkData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('quick_links')
        .insert({ ...newLinkData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateQuickLinksQueries();
    },
  });

  const updateQuickLinkMutation = useMutation<QuickLink, Error, { id: string; updates: UpdateQuickLinkData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('quick_links')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateQuickLinksQueries();
    },
  });

  const deleteQuickLinkMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('quick_links')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQuickLinksQueries();
    },
  });

  return {
    quickLinks,
    isLoading,
    error,
    addQuickLink: addQuickLinkMutation.mutateAsync,
    updateQuickLink: updateQuickLinkMutation.mutateAsync,
    deleteQuickLink: deleteQuickLinkMutation.mutateAsync,
  };
};