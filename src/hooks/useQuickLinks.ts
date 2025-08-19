import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface QuickLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  image_url: string | null;
  link_order: number | null;
  created_at: string;
  emoji: string | null;
  background_color: string | null;
  avatar_text: string | null;
}

export const useQuickLinks = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const { data: quickLinks = [], isLoading: loading, error } = useQuery<QuickLink[], Error>({
    queryKey: ['quickLinks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', userId)
        .order('link_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (error) {
      showError('Failed to load quick links.');
      console.error(error);
    }
  }, [error]);

  const addQuickLinkMutation = useMutation<QuickLink, Error, { title: string; url: string; imageFile?: File | null; emoji?: string | null; backgroundColor?: string | null; avatarText?: string | null; }>({
    mutationFn: async (linkData) => {
      if (!userId) throw new Error('User not authenticated.');
      let imageUrl: string | null = null;
      if (linkData.imageFile) {
        const filePath = `quick_links/${userId}/${uuidv4()}`;
        const { error: uploadError } = await supabase.storage
          .from('devideaimages') // Reusing existing bucket for simplicity
          .upload(filePath, linkData.imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('devideaimages').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('quick_links')
        .insert({ 
          title: linkData.title, 
          url: linkData.url, 
          image_url: imageUrl,
          user_id: userId,
          link_order: quickLinks.length,
          emoji: linkData.emoji,
          background_color: linkData.backgroundColor,
          avatar_text: linkData.avatarText,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Quick link added!');
      queryClient.invalidateQueries({ queryKey: ['quickLinks', userId] });
    },
    onError: (err) => {
      showError('Failed to add quick link.');
      console.error(err);
    },
  });

  const updateQuickLinkMutation = useMutation<QuickLink, Error, { id: string; updates: { title: string; url: string; image_url?: string | null; emoji?: string | null; background_color?: string | null; avatar_text?: string | null; }; imageFile?: File | null; }>({
    mutationFn: async ({ id, imageFile, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      
      const dbUpdates: Partial<Omit<QuickLink, 'id' | 'user_id' | 'created_at'>> = {
        ...updates,
      };

      if (imageFile) {
        const filePath = `quick_links/${userId}/${uuidv4()}`;
        const { error: uploadError } = await supabase.storage
          .from('devideaimages')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('devideaimages').getPublicUrl(filePath);
        dbUpdates.image_url = urlData.publicUrl;
      } else {
        dbUpdates.image_url = updates.image_url;
      }

      const { data, error } = await supabase
        .from('quick_links')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Quick link updated!');
      queryClient.invalidateQueries({ queryKey: ['quickLinks', userId] });
    },
    onError: (err) => {
      console.error("Update Quick Link Error:", err);
      showError('Failed to update quick link.');
    },
  });

  const deleteQuickLinkMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('quick_links').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Quick link removed.');
      queryClient.invalidateQueries({ queryKey: ['quickLinks', userId] });
    },
    onError: (err) => {
      showError('Failed to remove quick link.');
      console.error(err);
    },
  });

  return {
    quickLinks,
    loading,
    addQuickLink: addQuickLinkMutation.mutateAsync,
    updateQuickLink: updateQuickLinkMutation.mutateAsync,
    deleteQuickLink: deleteQuickLinkMutation.mutateAsync,
  };
};