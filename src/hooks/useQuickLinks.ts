import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { v4 as uuidv4 } from 'uuid';

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
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuickLinks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', userId)
        .order('link_order');
      if (error) throw error;
      setQuickLinks(data || []);
    } catch (error: any) {
      showError('Failed to load quick links.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchQuickLinks();
  }, [fetchQuickLinks]);

  const addQuickLink = async (linkData: { title: string; url: string; imageFile?: File | null; emoji?: string | null; backgroundColor?: string | null; avatarText?: string | null; }) => {
    if (!userId) return null;
    try {
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
      setQuickLinks(prev => [...prev, data]);
      showSuccess('Quick link added!');
      return data;
    } catch (error) {
      showError('Failed to add quick link.');
      return null;
    }
  };

  const updateQuickLink = async (id: string, updates: { title: string; url: string; imageFile?: File | null; image_url?: string | null; emoji?: string | null; backgroundColor?: string | null; avatarText?: string | null; }) => {
    if (!userId) return null;
    try {
      const { imageFile, backgroundColor, avatarText, ...rest } = updates;
      
      const dbUpdates: Partial<Omit<QuickLink, 'id' | 'user_id' | 'created_at'>> = {
        ...rest,
        background_color: backgroundColor,
        avatar_text: avatarText,
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
      setQuickLinks(prev => prev.map(l => l.id === id ? data : l));
      showSuccess('Quick link updated!');
      return data;
    } catch (error: any) {
      console.error("Update Quick Link Error:", error);
      showError('Failed to update quick link.');
      return null;
    }
  };

  const deleteQuickLink = async (id: string) => {
    if (!userId) return false;
    try {
      const { error } = await supabase.from('quick_links').delete().eq('id', id);
      if (error) throw error;
      setQuickLinks(prev => prev.filter(l => l.id !== id));
      showSuccess('Quick link removed.');
      return true;
    } catch (error) {
      showError('Failed to remove quick link.');
      return false;
    }
  };

  return { quickLinks, loading, addQuickLink, updateQuickLink, deleteQuickLink };
};