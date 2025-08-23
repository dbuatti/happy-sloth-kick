import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, NewDevIdeaTagData, UpdateDevIdeaTagData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

export const useDevIdeas = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const invalidateIdeasQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devIdeas', userId] });
  }, [queryClient, userId]);

  const invalidateTagsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devIdeaTags', userId] });
  }, [queryClient, userId]);

  // Fetch Ideas
  const { data: ideas, isLoading: ideasLoading, error: ideasError } = useQuery<DevIdea[], Error>({
    queryKey: ['devIdeas', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('dev_ideas')
        .select('*, dev_idea_tags(*)') // Select tags directly
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(idea => ({
        ...idea,
        tags: idea.dev_idea_tags || [], // Ensure tags is an array
      })) as DevIdea[];
    },
    enabled: !!userId && !authLoading,
  });

  // Fetch Tags
  const { data: tags, isLoading: tagsLoading, error: tagsError } = useQuery<DevIdeaTag[], Error>({
    queryKey: ['devIdeaTags', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !authLoading,
  });

  // Add Idea
  const addIdeaMutation = useMutation<DevIdea, Error, NewDevIdeaData, unknown>({
    mutationFn: async (newIdeaData) => {
      if (!userId) throw new Error('User not authenticated');
      const { tagIds, ...ideaData } = newIdeaData;
      const { data: createdIdea, error: ideaError } = await supabase
        .from('dev_ideas')
        .insert({ ...ideaData, user_id: userId })
        .select('*')
        .single();
      if (ideaError) throw ideaError;

      if (tagIds && tagIds.length > 0) {
        const associations = tagIds.map((tagId: string) => ({ idea_id: createdIdea.id, tag_id: tagId }));
        const { error: assocError } = await supabase
          .from('dev_idea_tag_associations')
          .insert(associations);
        if (assocError) throw assocError;
      }

      return { ...createdIdea, tags: tags?.filter(tag => tagIds?.includes(tag.id)) || [] } as DevIdea;
    },
    onSuccess: () => {
      invalidateIdeasQueries();
    },
  });

  // Update Idea
  const updateIdeaMutation = useMutation<DevIdea, Error, { id: string; updates: UpdateDevIdeaData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { tagIds, ...ideaData } = updates;

      const { data: updatedIdea, error: ideaError } = await supabase
        .from('dev_ideas')
        .update(ideaData)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (ideaError) throw ideaError;

      // Update tag associations
      if (tagIds !== undefined) {
        // First, delete existing associations for this idea
        const { error: deleteError } = await supabase
          .from('dev_idea_tag_associations')
          .delete()
          .eq('idea_id', id);
        if (deleteError) throw deleteError;

        // Then, insert new associations
        if (tagIds.length > 0) {
          const associations = tagIds.map((tagId: string) => ({ idea_id: id, tag_id: tagId }));
          const { error: insertError } = await supabase
            .from('dev_idea_tag_associations')
            .insert(associations);
          if (insertError) throw insertError;
        }
      }

      return { ...updatedIdea, tags: tags?.filter(tag => tagIds?.includes(tag.id)) || [] } as DevIdea;
    },
    onSuccess: () => {
      invalidateIdeasQueries();
    },
  });

  // Delete Idea
  const deleteIdeaMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('dev_ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateIdeasQueries();
    },
  });

  // Create Tag
  const createTagMutation = useMutation<DevIdeaTag, Error, NewDevIdeaTagData, unknown>({
    mutationFn: async (newTagData) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .insert({ ...newTagData, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTagsQueries();
    },
  });

  // Update Tag
  const updateTagMutation = useMutation<DevIdeaTag, Error, { id: string; updates: UpdateDevIdeaTagData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTagsQueries();
    },
  });

  // Delete Tag
  const deleteTagMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!userId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('dev_idea_tags')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTagsQueries();
    },
  });

  return {
    ideas,
    tags,
    isLoading: ideasLoading || tagsLoading || authLoading,
    error: ideasError || tagsError,
    addIdea: addIdeaMutation.mutateAsync,
    updateIdea: updateIdeaMutation.mutateAsync,
    deleteIdea: deleteIdeaMutation.mutateAsync,
    createTag: createTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
  };
};