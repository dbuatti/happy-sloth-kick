import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { arrayMove } from '@dnd-kit/sortable';

export interface DevIdea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
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
    if (userId) {
      fetchIdeas();
    }
  }, [userId, fetchIdeas]);

  const addIdea = useCallback(async (ideaData: Omit<DevIdea, 'id' | 'user_id' | 'created_at'>) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { data, error } = await supabase
        .from('dev_ideas')
        .insert({ ...ideaData, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setIdeas(prev => [data, ...prev]);
      showSuccess('Idea added successfully!');
      return true;
    } catch (error: any) {
      console.error('Error adding idea:', error.message);
      showError('Failed to add idea.');
      return false;
    }
  }, [userId]);

  const updateIdea = useCallback(async (ideaId: string, updates: Partial<Omit<DevIdea, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { data, error } = await supabase
        .from('dev_ideas')
        .update(updates)
        .eq('id', ideaId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      setIdeas(prev => prev.map(idea => (idea.id === ideaId ? data : idea)));
      showSuccess('Idea updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating idea:', error.message);
      showError('Failed to update idea.');
      return false;
    }
  }, [userId]);

  const deleteIdea = useCallback(async (ideaId: string) => {
    if (!userId) {
      showError('User not authenticated.');
      return false;
    }
    try {
      const { error } = await supabase
        .from('dev_ideas')
        .delete()
        .eq('id', ideaId)
        .eq('user_id', userId);

      if (error) throw error;
      setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
      showSuccess('Idea deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting idea:', error.message);
      showError('Failed to delete idea.');
      return false;
    }
  }, [userId]);
  
  const reorderIdeas = useCallback((activeId: string, overId: string) => {
    setIdeas((items) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
  }, []);


  return {
    ideas,
    loading,
    addIdea,
    updateIdea,
    deleteIdea,
    reorderIdeas,
  };
};