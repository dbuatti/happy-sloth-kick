import { useAuth } from '@/context/AuthContext';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

export const useQuickLinks = () => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id;
  const queryClient = useQueryClient();

  const { data: quickLinks, isLoading, error, refetch } = useQuery<QuickLink[], Error>({
    queryKey: ['quickLinks', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', currentUserId)
        .order('link_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addQuickLinkMutation = useMutation<QuickLink, Error, NewQuickLinkData, unknown>({
    mutationFn: async (newLinkData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('quick_links')
        .insert({ ...newLinkData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
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
        .select('*')
        .single();
      if (error) throw error;
      return data;
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
        .eq('id', id);
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
    refetchQuickLinks: refetch,
    addQuickLink: addQuickLinkMutation.mutateAsync,
    updateQuickLink: updateQuickLinkMutation.mutateAsync,
    deleteQuickLink: deleteQuickLinkMutation.mutateAsync,
  };
};