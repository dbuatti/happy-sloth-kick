import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, NewDevIdeaTagData, UpdateDevIdeaTagData } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

// --- Dev Idea Tags ---
const fetchDevIdeaTags = async (userId: string): Promise<DevIdeaTag[]> => {
  const { data, error } = await supabase
    .from('dev_idea_tags')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as DevIdeaTag[];
};

const addDevIdeaTag = async (newTag: NewDevIdeaTagData & { user_id: string }): Promise<DevIdeaTag> => {
  const { data, error } = await supabase
    .from('dev_idea_tags')
    .insert(newTag)
    .select('*')
    .single();
  if (error) throw error;
  return data as DevIdeaTag;
};

const updateDevIdeaTag = async (id: string, updates: UpdateDevIdeaTagData): Promise<DevIdeaTag> => {
  const { data, error } = await supabase
    .from('dev_idea_tags')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DevIdeaTag;
};

const deleteDevIdeaTag = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('dev_idea_tags')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- Dev Ideas ---
const fetchDevIdeas = async (userId: string, tags: DevIdeaTag[]): Promise<DevIdea[]> => {
  const { data, error } = await supabase
    .from('dev_ideas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const ideas = data as DevIdea[];
  const tagsMap = new Map(tags.map(tag => [tag.id, tag]));

  // Fetch tag associations for all ideas
  const { data: associations, error: assocError } = await supabase
    .from('dev_idea_tag_associations')
    .select('*')
    .in('idea_id', ideas.map(idea => idea.id));

  if (assocError) throw assocError;

  const ideaTagsMap = new Map<string, string[]>();
  associations.forEach(assoc => {
    if (!ideaTagsMap.has(assoc.idea_id)) {
      ideaTagsMap.set(assoc.idea_id, []);
    }
    ideaTagsMap.get(assoc.idea_id)?.push(assoc.tag_id);
  });

  return ideas.map(idea => {
    const ideaTagIds = ideaTagsMap.get(idea.id) || [];
    const ideaTags = ideaTagIds
      .map(tagId => tagsMap.get(tagId))
      .filter((tag): tag is DevIdeaTag => !!tag); // Type predicate for filtering undefined
    return { ...idea, tags: ideaTags, status: idea.status as DevIdea['status'] }; // Ensure status is correctly typed
  });
};

const addDevIdea = async (newIdea: NewDevIdeaData & { user_id: string }): Promise<DevIdea> => {
  const { tagIds, ...ideaData } = newIdea;
  const { data, error } = await supabase
    .from('dev_ideas')
    .insert(ideaData)
    .select('*')
    .single();

  if (error) throw error;

  const createdIdea = data as DevIdea;

  // Insert tag associations
  if (tagIds && tagIds.length > 0) {
    const associations = tagIds.map(tagId => ({ idea_id: createdIdea.id, tag_id: tagId }));
    const { error: assocError } = await supabase
      .from('dev_idea_tag_associations')
      .insert(associations);
    if (assocError) throw assocError;
  }

  return { ...createdIdea, tags: [], status: createdIdea.status as DevIdea['status'] }; // Tags will be populated on refetch
};

const updateDevIdea = async (id: string, updates: UpdateDevIdeaData): Promise<DevIdea> => {
  const { tagIds, ...ideaUpdates } = updates;

  const { data, error } = await supabase
    .from('dev_ideas')
    .update(ideaUpdates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  const updatedIdea = data as DevIdea;

  // Update tag associations
  if (tagIds !== undefined) {
    // Delete existing associations
    await supabase.from('dev_idea_tag_associations').delete().eq('idea_id', id);
    // Insert new associations
    if (tagIds.length > 0) {
      const associations = tagIds.map(tagId => ({ idea_id: id, tag_id: tagId }));
      const { error: assocError } = await supabase
        .from('dev_idea_tag_associations')
        .insert(associations);
      if (assocError) throw assocError;
    }
  }

  return { ...updatedIdea, tags: [], status: updatedIdea.status as DevIdea['status'] }; // Tags will be populated on refetch
};

const deleteDevIdea = async (id: string): Promise<void> => {
  // Delete associations first
  await supabase.from('dev_idea_tag_associations').delete().eq('idea_id', id);
  const { error } = await supabase
    .from('dev_ideas')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const useDevIdeas = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // --- Tags Query ---
  const { data: tags, isLoading: isLoadingTags, error: errorTags } = useQuery<DevIdeaTag[], Error>({
    queryKey: ['devIdeaTags', userId],
    queryFn: () => fetchDevIdeaTags(userId!),
    enabled: !!userId && !authLoading,
  });

  const invalidateTagsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devIdeaTags', userId] });
    queryClient.invalidateQueries({ queryKey: ['devIdeas', userId] }); // Invalidate ideas as well
  }, [queryClient, userId]);

  const createTag = useMutation<DevIdeaTag, Error, NewDevIdeaTagData>({
    mutationFn: async (newTag) => {
      if (!userId) throw new Error('User not authenticated.');
      return addDevIdeaTag({ ...newTag, user_id: userId });
    },
    onSuccess: invalidateTagsQueries,
  });

  const updateTag = useMutation<DevIdeaTag, Error, { id: string; updates: UpdateDevIdeaTagData }>({
    mutationFn: ({ id, updates }) => updateDevIdeaTag(id, updates),
    onSuccess: invalidateTagsQueries,
  });

  const deleteTag = useMutation<void, Error, string>({
    mutationFn: (id) => deleteDevIdeaTag(id),
    onSuccess: invalidateTagsQueries,
  });

  // --- Ideas Query ---
  const { data: ideas, isLoading: isLoadingIdeas, error: errorIdeas } = useQuery<DevIdea[], Error>({
    queryKey: ['devIdeas', userId],
    queryFn: async () => {
      if (!userId || !tags) return [];
      return fetchDevIdeas(userId, tags);
    },
    enabled: !!userId && !authLoading && !!tags, // Only enable if tags are loaded
  });

  const invalidateIdeasQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devIdeas', userId] });
  }, [queryClient, userId]);

  const addIdeaMutation = useMutation<DevIdea, Error, NewDevIdeaData>({
    mutationFn: async (ideaData) => {
      if (!userId) throw new Error('User not authenticated.');
      return addDevIdea({ ...ideaData, user_id: userId });
    },
    onSuccess: invalidateIdeasQueries,
  });

  const updateIdeaMutation = useMutation<DevIdea, Error, { id: string; updates: UpdateDevIdeaData }>({
    mutationFn: async ({ id, updates }) => {
      if (!userId) throw new Error('User not authenticated.');
      return updateDevIdea(id, updates);
    },
    onSuccess: invalidateIdeasQueries,
  });

  const deleteIdeaMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteDevIdea(id),
    onSuccess: invalidateIdeasQueries,
  });

  return {
    ideas: ideas || [],
    tags: tags || [],
    isLoading: isLoadingIdeas || isLoadingTags || authLoading,
    error: errorIdeas || errorTags,
    addIdea: addIdeaMutation.mutateAsync,
    updateIdea: updateIdeaMutation.mutateAsync,
    deleteIdea: deleteIdeaMutation.mutateAsync,
    createTag: createTag.mutateAsync,
    updateTag: updateTag.mutateAsync,
    deleteTag: deleteTag.mutateAsync,
  };
};