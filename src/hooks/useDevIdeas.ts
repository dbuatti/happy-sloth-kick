import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';

export interface DevIdeaTag {
  id: string;
  name: string;
  color: string;
}

export interface DevIdea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  image_url?: string | null;
  tags: DevIdeaTag[];
}

export const useDevIdeas = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [ideas, setIdeas] = useState<DevIdea[]>([]);
  const [tags, setTags] = useState<DevIdeaTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeasAndTags = useCallback(async () => {
    if (!userId) {
      setIdeas([]);
      setTags([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ideasRes, tagsRes, associationsRes] = await Promise.all([
        supabase.from('dev_ideas').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('dev_idea_tags').select('*').eq('user_id', userId),
        supabase.from('dev_idea_tag_associations').select('*'),
      ]);

      if (ideasRes.error) throw ideasRes.error;
      if (tagsRes.error) throw tagsRes.error;
      if (associationsRes.error) throw associationsRes.error;

      const tagsData = tagsRes.data || [];
      const ideasData = ideasRes.data || [];
      const associationsData = associationsRes.data || [];

      setTags(tagsData);

      const tagsMap = new Map(tagsData.map(t => [t.id, t]));
      const ideasWithTags = ideasData.map(idea => {
        const ideaTags = associationsData
          .filter(assoc => assoc.idea_id === idea.id)
          .map(assoc => tagsMap.get(assoc.tag_id))
          .filter((tag): tag is DevIdeaTag => !!tag);
        return { ...idea, tags: ideaTags };
      });

      setIdeas(ideasWithTags);
    } catch (error: any) {
      console.error('Error fetching dev ideas and tags:', error.message);
      showError('Failed to load ideas and tags.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIdeasAndTags();
  }, [fetchIdeasAndTags]);

  const manageIdeaTags = async (ideaId: string, tagIds: string[]) => {
    const { error: deleteError } = await supabase
      .from('dev_idea_tag_associations')
      .delete()
      .eq('idea_id', ideaId);

    if (deleteError) throw deleteError;

    if (tagIds.length > 0) {
      const newAssociations = tagIds.map(tagId => ({
        idea_id: ideaId,
        tag_id: tagId,
      }));
      const { error: insertError } = await supabase
        .from('dev_idea_tag_associations')
        .insert(newAssociations);
      if (insertError) throw insertError;
    }
  };

  const addIdea = async (ideaData: Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'tags'> & { tagIds: string[] }) => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { tagIds, ...ideaDetails } = ideaData;
      const { data, error } = await supabase
        .from('dev_ideas')
        .insert({ ...ideaDetails, user_id: userId })
        .select()
        .single();
      if (error) throw error;

      await manageIdeaTags(data.id, tagIds);
      await fetchIdeasAndTags(); // Refetch to get updated data with tags
      showSuccess('Idea added!');
      return data;
    } catch (error: any) {
      showError('Failed to add idea.');
      return null;
    }
  };

  const updateIdea = async (id: string, updates: Partial<Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'tags'>> & { tagIds?: string[] }) => {
    if (!userId) {
      showError('User not authenticated.');
      return null;
    }
    try {
      const { tagIds, ...ideaDetails } = updates;
      const { data, error } = await supabase
        .from('dev_ideas')
        .update(ideaDetails)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;

      if (tagIds) {
        await manageIdeaTags(id, tagIds);
      }
      await fetchIdeasAndTags(); // Refetch to get updated data with tags
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
        await supabase.storage.from('devideaimages').remove([imageKey]);
      }

      setIdeas(prev => prev.filter(idea => idea.id !== id));
      showSuccess('Idea deleted!');
      return true;
    } catch (error: any) {
      showError('Failed to delete idea.');
      return false;
    }
  };

  const addTag = async (name: string, color: string) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .insert({ name, color, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setTags(prev => [...prev, data]);
      return data;
    } catch (error) {
      showError('Failed to add tag.');
      return null;
    }
  };

  const updateTag = async (id: string, updates: Partial<Omit<DevIdeaTag, 'id'>>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setTags(prev => prev.map(t => t.id === id ? data : t));
      await fetchIdeasAndTags(); // Refetch ideas to update tag colors on cards
    } catch (error) {
      showError('Failed to update tag.');
    }
  };

  const deleteTag = async (id: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from('dev_idea_tags').delete().eq('id', id);
      if (error) throw error;
      setTags(prev => prev.filter(t => t.id !== id));
      await fetchIdeasAndTags(); // Refetch ideas to remove deleted tags
    } catch (error) {
      showError('Failed to delete tag.');
    }
  };

  return { ideas, tags, loading, addIdea, updateIdea, deleteIdea, setIdeas, addTag, updateTag, deleteTag };
};