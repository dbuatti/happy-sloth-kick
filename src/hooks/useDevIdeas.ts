import { useAuth } from '@/context/AuthContext';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, NewDevIdeaTagData, UpdateDevIdeaTagData, Json } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

export const useDevIdeas = (isDemo = false, demoUserId?: string) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;
  const queryClient = useQueryClient();

  const { data: ideas, isLoading: ideasLoading, error: ideasError, refetch: refetchIdeas } = useQuery<DevIdea[], Error>({
    queryKey: ['dev_ideas', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('dev_ideas')
        .select('*, dev_idea_tag_associations(tag_id), dev_idea_tags(*)') // Fetch tags through the association table
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to include tags directly on the idea object
      return data.map(idea => ({
        ...idea,
        tags: idea.dev_idea_tag_associations.map((assoc: any) => assoc.dev_idea_tags).filter(Boolean) as DevIdeaTag[],
      })) as DevIdea[];
    },
    enabled: !!currentUserId && !authLoading,
  });

  const { data: tags, isLoading: tagsLoading, error: tagsError, refetch: refetchTags } = useQuery<DevIdeaTag[], Error>({
    queryKey: ['dev_idea_tags', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .select('*')
        .eq('user_id', currentUserId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentUserId && !authLoading,
  });

  const addIdeaMutation = useMutation<DevIdea, Error, NewDevIdeaData & { tagIds?: string[] }, unknown>({
    mutationFn: async ({ tagIds = [], ...newIdeaData }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_ideas')
        .insert({ ...newIdeaData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;

      if (tagIds.length > 0) {
        const associations = tagIds.map(tag_id => ({ idea_id: data.id, tag_id }));
        const { error: assocError } = await supabase
          .from('dev_idea_tag_associations')
          .insert(associations);
        if (assocError) throw assocError;
      }

      // Refetch to get the idea with its associated tags
      const { data: fetchedIdea, error: fetchError } = await supabase
        .from('dev_ideas')
        .select('*, dev_idea_tag_associations(tag_id), dev_idea_tags(*)')
        .eq('id', data.id)
        .single();

      if (fetchError) throw fetchError;

      return {
        ...fetchedIdea,
        tags: fetchedIdea.dev_idea_tag_associations.map((assoc: any) => assoc.dev_idea_tags).filter(Boolean) as DevIdeaTag[],
      } as DevIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev_ideas', currentUserId] });
      toast.success('Idea added!');
    },
  });

  const updateIdeaMutation = useMutation<DevIdea, Error, { id: string; updates: UpdateDevIdeaData & { tagIds?: string[] } }, unknown>({
    mutationFn: async ({ id, updates: { tagIds = [], ...ideaUpdates } }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_ideas')
        .update(ideaUpdates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      // Update tag associations
      await supabase.from('dev_idea_tag_associations').delete().eq('idea_id', id);
      if (tagIds.length > 0) {
        const associations = tagIds.map(tag_id => ({ idea_id: id, tag_id }));
        const { error: assocError } = await supabase
          .from('dev_idea_tag_associations')
          .insert(associations);
        if (assocError) throw assocError;
      }

      // Refetch to get the updated idea with its associated tags
      const { data: fetchedIdea, error: fetchError } = await supabase
        .from('dev_ideas')
        .select('*, dev_idea_tag_associations(tag_id), dev_idea_tags(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return {
        ...fetchedIdea,
        tags: fetchedIdea.dev_idea_tag_associations.map((assoc: any) => assoc.dev_idea_tags).filter(Boolean) as DevIdeaTag[],
      } as DevIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev_ideas', currentUserId] });
      toast.success('Idea updated!');
    },
  });

  const deleteIdeaMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('dev_ideas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev_ideas', currentUserId] });
      toast.success('Idea deleted!');
    },
  });

  const createTagMutation = useMutation<DevIdeaTag, Error, NewDevIdeaTagData, unknown>({
    mutationFn: async (newTagData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .insert({ ...newTagData, user_id: currentUserId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev_idea_tags', currentUserId] });
      toast.success('Tag created!');
    },
  });

  const updateTagMutation = useMutation<DevIdeaTag, Error, { id: string; updates: UpdateDevIdeaTagData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev_idea_tags', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['dev_ideas', currentUserId] }); // Ideas might need to reflect tag name/color changes
      toast.success('Tag updated!');
    },
  });

  const deleteTagMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('dev_idea_tags')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev_idea_tags', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['dev_ideas', currentUserId] }); // Ideas might need to reflect tag removal
      toast.success('Tag deleted!');
    },
  });

  return {
    ideas,
    tags,
    isLoading: ideasLoading || tagsLoading,
    error: ideasError || tagsError,
    refetchIdeas,
    refetchTags,
    addIdea: addIdeaMutation.mutateAsync,
    updateIdea: updateIdeaMutation.mutateAsync,
    deleteIdea: deleteIdeaMutation.mutateAsync,
    createTag: createTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
  };
};