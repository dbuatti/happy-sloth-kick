import { useAuth } from '@/context/AuthContext';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UseQuickLinksProps {
  userId?: string;
}

export const useQuickLinks = ({ userId: propUserId }: UseQuickLinksProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: quickLinks, isLoading, error } = useQuery<QuickLink[], Error>({
    queryKey: ['quickLinks', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', currentUserId)
        .order('link_order', { ascending: true });

      if (error) throw error;
      return data as QuickLink[];
    },
    enabled: !!currentUserId,
  });

  const addQuickLinkMutation = useMutation<QuickLink, Error, NewQuickLinkData, unknown>({
    mutationFn: async (newLinkData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('quick_links')
        .insert({ ...newLinkData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as QuickLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks', currentUserId] });
      toast.success('Quick link added!');
    },
  });

  const updateQuickLinkMutation = useMutation<QuickLink, Error, { id: string; updates: UpdateQuickLinkData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('quick_links')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as QuickLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks', currentUserId] });
      toast.success('Quick link updated!');
    },
  });

  const deleteQuickLinkMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('quick_links')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickLinks', currentUserId] });
      toast.success('Quick link deleted!');
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