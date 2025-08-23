import { useAuth } from '@/context/AuthContext';
import { DevIdea, DevIdeaTag, NewDevIdeaData, UpdateDevIdeaData, NewDevIdeaTagData, UpdateDevIdeaTagData, Json } from '@/types';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';

interface UseDevIdeasProps {
  userId?: string;
}

export const useDevIdeas = ({ userId: propUserId }: UseDevIdeasProps = {}) => {
  const { user } = useAuth();
  const currentUserId = propUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: ideas, isLoading: isLoadingIdeas, error: ideasError } = useQuery<DevIdea[], Error>({
    queryKey: ['devIdeas', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('dev_ideas')
        .select('*, dev_idea_tag_associations(dev_idea_tags(*))')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(idea => ({
        ...idea,
        tags: idea.dev_idea_tag_associations.map(assoc => assoc.dev_idea_tags).filter(Boolean) as DevIdeaTag[],
      })) as DevIdea[];
    },
    enabled: !!currentUserId,
  });

  const { data: tags, isLoading: isLoadingTags, error: tagsError } = useQuery<DevIdeaTag[], Error>({
    queryKey: ['devIdeaTags', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .select('*')
        .eq('user_id', currentUserId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as DevIdeaTag[];
    },
    enabled: !!currentUserId,
  });

  const addIdeaMutation = useMutation<DevIdea, Error, NewDevIdeaData, unknown>({
    mutationFn: async ({ tagIds, ...newIdeaData }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_ideas')
        .insert({ ...newIdeaData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;

      if (tagIds && tagIds.length > 0) {
        const associations = tagIds.map((tag_id: string) => ({ idea_id: data.id, tag_id }));
        const { error: assocError } = await supabase
          .from('dev_idea_tag_associations')
          .insert(associations);
        if (assocError) throw assocError;
      }

      return data as DevIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeas', currentUserId] });
      toast.success('Dev idea added!');
    },
  });

  const updateIdeaMutation = useMutation<DevIdea, Error, { id: string; updates: UpdateDevIdeaData }, unknown>({
    mutationFn: async ({ id, updates: { tagIds, ...ideaUpdates } }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_ideas')
        .update(ideaUpdates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;

      // Update tags
      if (tagIds !== undefined) {
        // Delete existing associations
        const { error: deleteError } = await supabase
          .from('dev_idea_tag_associations')
          .delete()
          .eq('idea_id', id);
        if (deleteError) throw deleteError;

        // Insert new associations
        if (tagIds.length > 0) {
          const associations = tagIds.map((tag_id: string) => ({ idea_id: id, tag_id }));
          const { error: insertError } = await supabase
            .from('dev_idea_tag_associations')
            .insert(associations);
          if (insertError) throw insertError;
        }
      }

      return data as DevIdea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeas', currentUserId] });
      toast.success('Dev idea updated!');
    },
  });

  const deleteIdeaMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('dev_ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeas', currentUserId] });
      toast.success('Dev idea deleted!');
    },
  });

  const addTagMutation = useMutation<DevIdeaTag, Error, NewDevIdeaTagData, unknown>({
    mutationFn: async (newTagData) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .insert({ ...newTagData, user_id: currentUserId })
        .select()
        .single();

      if (error) throw error;
      return data as DevIdeaTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeaTags', currentUserId] });
      toast.success('Tag added!');
    },
  });

  const updateTagMutation = useMutation<DevIdeaTag, Error, { id: string; updates: UpdateDevIdeaTagData }, unknown>({
    mutationFn: async ({ id, updates }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('dev_idea_tags')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      return data as DevIdeaTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeaTags', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['devIdeas', currentUserId] }); // Ideas might need tag name/color updates
      toast.success('Tag updated!');
    },
  });

  const deleteTagMutation = useMutation<void, Error, string, unknown>({
    mutationFn: async (id) => {
      if (!currentUserId) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('dev_idea_tags')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devIdeaTags', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['devIdeas', currentUserId] }); // Ideas might need tag name/color updates
      toast.success('Tag deleted!');
    },
  });

  return {
    ideas: ideas || [],
    isLoadingIdeas,
    ideasError,
    addIdea: addIdeaMutation.mutateAsync,
    updateIdea: updateIdeaMutation.mutateAsync,
    deleteIdea: deleteIdeaMutation.mutateAsync,
    tags: tags || [],
    isLoadingTags,
    tagsError,
    addTag: addTagMutation.mutateAsync,
    updateTag: updateTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,
  };
};