import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';

export interface DevIdea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  image_url?: string | null;
}

export const useDevIdeas = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [ideas, setIdeas] = useState<DevIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    if (!userId) {
      setIdeas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dev_ideas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (error: any) {
      console.error('Error fetching dev ideas:', error.message);
      showError('Failed to load ideas.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const addIdea = async (ideaData: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('dev_ideas')
        .insert({ ...ideaData, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setIdeas(prev => [data, ...prev]);
      showSuccess('Idea added!');
      return data;
    } catch (error: any) {
      showError('Failed to add idea.');
      return null;
    }
  };

  const updateIdea = async (id: string, updates: Partial<Omit<DevIdea, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { data: existingIdea, error: fetchError } = await supabase
        .from('dev_ideas')
        .select('image_url')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('dev_ideas')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;

      if (existingIdea?.image_url && existingIdea.image_url !== data.image_url) {
        const oldImageKey = existingIdea.image_url.substring(existingIdea.image_url.lastIndexOf('/') + 1);
        await supabase.storage.from('dev_idea_images').remove([oldImageKey]);
      }

      setIdeas(prev => prev.map(idea => (idea.id === id ? data : idea)));
      showSuccess('Idea updated!');
      return data;
    } catch (error: any) {
      showError('Failed to update idea.');
      return null;
    }
  };

  const deleteIdea = async (id: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { data: existingIdea, error: fetchError } = await supabase
        .from('dev_ideas')
        .select('image_url')
        .eq('id', id)
        .single();
      if (fetchError) {
        console.error('Could not fetch idea to delete image.');
      }

      const { error } = await supabase
        .from('dev_ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;

      if (existingIdea?.image_url) {
        const imageKey = existingIdea.image_url.substring(existingIdea.image_url.lastIndexOf('/') + 1);
        await supabase.storage.from('dev_idea_images').remove([imageKey]);
      }

      setIdeas(prev => prev.filter(idea => idea.id !== id));
      showSuccess('Idea deleted!');
      return true;
    } catch (error: any) {
      showError('Failed to delete idea.');
      return false;
    }
  };

  return { ideas, loading, addIdea, updateIdea, deleteIdea, setIdeas };
};