import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { QuickLink, NewQuickLinkData, UpdateQuickLinkData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

const fetchQuickLinks = async (userId: string): Promise<QuickLink[]> => {
  const { data, error } = await supabase
    .from('quick_links')
    .select('*')
    .eq('user_id', userId)
    .order('link_order', { ascending: true });
  if (error) throw error;
  return data as QuickLink[];
};

const addQuickLink = async (newLink: NewQuickLinkData & { user_id: string; link_order: number }): Promise<QuickLink> => {
  const { data, error } = await supabase
    .from('quick_links')
    .insert(newLink)
    .select('*')
    .single();
  if (error) throw error;
  return data as QuickLink;
};

const updateQuickLink = async (id: string, updates: UpdateQuickLinkData): Promise<QuickLink> => {
  const { data, error } = await supabase
    .from('quick_links')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as QuickLink;
};

const deleteQuickLink = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('quick_links')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

const updateQuickLinksOrder = async (updates: { id: string; link_order: number; user_id: string; title: string; url: string }[]): Promise<void> => {
  const { error } = await supabase
    .from('quick_links')
    .upsert(updates, { onConflict: 'id' });
  if (error) throw error;
};

export const useQuickLinks = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: quickLinks, isLoading, error } = useQuery<QuickLink[], Error>({
    queryKey: ['quickLinks', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchQuickLinks(userId);
    },
    enabled: !!userId && !authLoading,
  });

  const invalidateQuickLinksQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quickLinks', userId] });
  }, [queryClient, userId]);

  const addQuickLinkMutation = useMutation<QuickLink, Error, { title: string; url: string; imageFile?: File | null; emoji?: string | null; backgroundColor?: string | null; avatarText?: string | null; }>({
    mutationFn: async (linkData) => {
      if (!userId) throw new Error('User not authenticated.');

      let image_url: string | null = null;
      if (linkData.imageFile) {
        const fileExt = linkData.imageFile.name.split('.').pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('link_images')
          .upload(filePath, linkData.imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('link_images').getPublicUrl(filePath);
        image_url = publicUrlData.publicUrl;
      }

      const newLink: NewQuickLinkData & { user_id: string; link_order: number } = {
        user_id: userId,
        title: linkData.title,
        url: linkData.url,
        image_url: image_url,
        link_order: (quickLinks as QuickLink[]).length,
        emoji: linkData.emoji,
        background_color: linkData.backgroundColor,
        avatar_text: linkData.avatarText,
      };
      return addQuickLink(newLink);
    },
    onSuccess: invalidateQuickLinksQueries,
  });

  const updateQuickLinkMutation = useMutation<QuickLink, Error, { id: string; updates: { title?: string; url?: string; image_url?: string | null; emoji?: string | null; background_color?: string | null; avatar_text?: string | null; }; imageFile?: File | null; }>({
    mutationFn: async ({ id, imageFile, updates }) => {
      if (!userId) throw new Error('User not authenticated.');

      let image_url: string | null | undefined = updates.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('link_images')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('link_images').getPublicUrl(filePath);
        image_url = publicUrlData.publicUrl;

        // Optionally, delete old image if it exists
        const linkToUpdate = (quickLinks as QuickLink[]).find(link => link.id === id);
        if (linkToUpdate?.image_url) {
          const oldFilePath = linkToUpdate.image_url.split('/link_images/')[1];
          await supabase.storage.from('link_images').remove([oldFilePath]);
        }
      } else if (updates.image_url === null) {
        // If image_url is explicitly set to null, remove existing image
        const linkToUpdate = (quickLinks as QuickLink[]).find(link => link.id === id);
        if (linkToUpdate?.image_url) {
          const oldFilePath = linkToUpdate.image_url.split('/link_images/')[1];
          await supabase.storage.from('link_images').remove([oldFilePath]);
        }
      }

      return updateQuickLink(id, { ...updates, image_url });
    },
    onSuccess: invalidateQuickLinksQueries,
  });

  const deleteQuickLinkMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const linkToDelete = (quickLinks as QuickLink[]).find(link => link.id === id);
      if (linkToDelete?.image_url) {
        const filePath = linkToDelete.image_url.split('/link_images/')[1];
        await supabase.storage.from('link_images').remove([filePath]);
      }
      return deleteQuickLink(id);
    },
    onSuccess: invalidateQuickLinksQueries,
  });

  const reorderQuickLinksMutation = useMutation<void, Error, QuickLink[]>({
    mutationFn: async (links) => {
      if (!userId) throw new Error('User not authenticated.');
      const updates = links.map((link, index) => ({
        id: link.id,
        link_order: index,
        user_id: userId,
        title: link.title, // Include title for upsert
        url: link.url, // Include url for upsert
      }));
      await updateQuickLinksOrder(updates);
    },
    onSuccess: invalidateQuickLinksQueries,
  });

  return {
    quickLinks: quickLinks || [],
    isLoading,
    error,
    addQuickLink: addQuickLinkMutation.mutateAsync,
    updateQuickLink: updateQuickLinkMutation.mutateAsync,
    deleteQuickLink: deleteQuickLinkMutation.mutateAsync,
    reorderQuickLinks: reorderQuickLinksMutation.mutateAsync,
  };
};