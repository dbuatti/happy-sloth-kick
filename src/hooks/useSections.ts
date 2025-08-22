import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskSection } from '@/types/task';
import { useAuth } from '@/context/AuthContext';

export const useSections = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    if (!user) {
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    if (error) {
      setError(error.message);
      console.error('Error fetching sections:', error);
      setSections([]);
    } else {
      setSections(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const addSection = async (name: string, includeInFocusMode: boolean = true) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order || 0)) + 1 : 0;
    const { data, error } = await supabase
      .from('task_sections')
      .insert({ user_id: user.id, name, order: newOrder, include_in_focus_mode: includeInFocusMode })
      .select()
      .single();

    if (error) {
      setError(error.message);
      console.error('Error adding section:', error);
    } else if (data) {
      setSections(prev => [...prev, data]);
    }
  };

  const updateSection = async (id: string, updates: Partial<TaskSection>) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    const { data, error } = await supabase
      .from('task_sections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      console.error('Error updating section:', error);
    } else if (data) {
      setSections(prev => prev.map(s => (s.id === id ? data : s)));
    }
  };

  const deleteSection = async (id: string) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    const { error } = await supabase
      .from('task_sections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      setError(error.message);
      console.error('Error deleting section:', error);
    } else {
      setSections(prev => prev.filter(s => s.id !== id));
    }
  };

  const reorderSections = async (newOrder: { id: string; order: number }[]) => {
    if (!user) {
      setError('User not authenticated.');
      return;
    }
    // Optimistically update UI
    setSections(prev => {
      const updated = [...prev];
      newOrder.forEach(item => {
        const index = updated.findIndex(s => s.id === item.id);
        if (index !== -1) {
          updated[index].order = item.order;
        }
      });
      return updated.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    const { error } = await supabase
      .from('task_sections')
      .upsert(newOrder.map(item => ({ id: item.id, order: item.order, user_id: user.id })));

    if (error) {
      setError(error.message);
      console.error('Error reordering sections:', error);
      // Revert on error if necessary, or refetch
      fetchSections();
    }
  };

  const updateSectionIncludeInFocusMode = async (sectionId: string, include: boolean) => {
    await updateSection(sectionId, { include_in_focus_mode: include });
  };

  return {
    sections,
    loading,
    error,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    updateSectionIncludeInFocusMode,
    fetchSections,
  };
};