import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext'; // Added missing import

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
  updated_at: string;
  image_url?: string | null;
  local_file_path?: string | null; // Added local_file_path
  tags: DevIdeaTag[];
}

export const useDevIdeas = (props?: { userId?: string }) => {
  const { user } = useAuth();
  const userId = props?.userId || user?.id;
  const queryClient = useQueryClient();

  const fetchAllDevData = useCallback(async () => {
    if (!userId) return { ideas: [], tags: [] };

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

    const tagsMap = new Map(tagsData.map(t => [t.id, t]));
    const ideasWithTags = ideasData.map(idea => {
      const ideaTags = associationsData
        .filter(assoc => assoc.idea_id === idea.id)
        .map(assoc => tagsMap.get(assoc.tag_id))
        .filter((tag): tag is DevIdeaTag => !!tag);
      return { ...idea, tags: ideaTags };
    });

    return { ideas: ideasWithTags, tags: tagsData };
  }, [userId]);

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['devIdeasAndTags', userId],
    queryFn: fetchAllDevData,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const ideas = data?.ideas || [];
  const tags = data?.tags || [];

  useEffect(() => {
    if (error) {
      console.error('Error fetching dev ideas and tags:', error.message);
      showError('Failed to load ideas and tags.');
    }
  }, [error]);

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

  const addIdeaMutation = useMutation<DevIdea, Error, Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'> & { tagIds: string[] }>({
    mutationFn: async (ideaData) => {
      if (!userId) throw new Error('User not authenticated.');
      const { tagIds, ...ideaDetails } = ideaData;
      const { data, error } = await supabase
        .from('dev_ideas')
        .insert({ ...ideaDetails, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      await manageIdeaTags(data.id, tagIds);
      return data;
    },
    onSuccess: () => {
      showSuccess('Idea added!');
      queryClient.invalidateQueries({ queryKey: ['devIdeasAndTags', userId] });
    },
    onError: (err) => {
      showError('Failed to add idea.');
      console.error(err);
    },
  });

  const updateIdeaMutation = useMutation<DevIdea, Error, { id: string; updates: Partial<Omit<DevIdea, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'tags'>> & { tagIds?: string[] } }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
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
      return data;
    },
    onSuccess: () => {
      showSuccess('Idea updated!');
      queryClient.invalidateQueries({ queryKey: ['devIdeasAndTags', userId] });
    },
    onError: (err) => {
      showError('Failed to update idea.');
      console.error(err);
    },
  });

  const deleteIdeaMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
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
      return true;
    },
    onSuccess: () => {
      showSuccess('Idea deleted!');
      queryClient.invalidateQueries({ queryKey: ['devIdeasAndTags', userId] });
    },
    onError: (err) => {
      showError('Failed to delete idea.');
      console.error(err);
    },
  });

  const addTagMutation = useMutation<DevIdeaTag, Error, { name: string; color: string }>({
    mutationFn: async ({ name, color }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .insert({ name, color, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeasAndTags', userId] });
    },
    onError: (err) => {
      showError('Failed to add tag.');
      console.error(err);
    },
  });

  const updateTagMutation = useMutation<DevIdeaTag, Error, { id: string; updates: Partial<Omit<DevIdeaTag, 'id'>> }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Tag updated!');
      queryClient.invalidateQueries({ queryKey: ['devIdeasAndTags', userId] });
    },
    onError: (err) => {
      showError('Failed to update tag.');
      console.error(err);
    },
  });

  const deleteTagMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated.');
      const { error } = await supabase.from('dev_idea_tags').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      showSuccess('Tag deleted!');
      queryClient.invalidateQueries({ queryKey: ['devIdeasAndTags', userId] });
    },
    onError: (err) => {
      showError('Failed to delete tag.');
      console.error(err);
    },
  });

  return {
    ideas,
    tags,
    loading,
    addIdea: addIdeaMutation.mutateAsync,
    updateIdea: updateIdeaMutation.mutateAsync,
    deleteIdea: deleteIdeaMutation.mutateAsync,
    setIdeas: (newIdeas: DevIdea[]) => queryClient.setQueryData(['devIdeasAndTags', userId], (oldData: { ideas: DevIdea[]; tags: DevIdeaTag[]; } | undefined) => ({ ...oldData!, ideas: newIdeas, tags: oldData?.tags || [] })),
    addTag: addTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
  };
};