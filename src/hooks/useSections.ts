import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskSection } from '@/types/task';
import { useAuth } from '@/context/AuthContext';

interface UseSectionsResult {
  sections: TaskSection[];
  loading: boolean;
  addSection: (name: string, order?: number | null) => Promise<void>;
  updateSection: (id: string, updates: Partial<TaskSection>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (updates: { id: string; order: number }[]) => Promise<void>;
  updateSectionIncludeInFocusMode: (id: string, include: boolean) => Promise<void>;
}

export const useSections = (): UseSectionsResult => {
  const { user } = useAuth();
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('task_sections')
      .select('*')
      .eq('user_id', user.id)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching sections:', error);
    } else {
      setSections(data as TaskSection[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const addSection = async (name: string, order: number | null = null) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('task_sections')
      .insert({ user_id: user.id, name, order })
      .select();
    if (error) {
      console.error('Error adding section:', error);
    } else if (data) {
      setSections((prev) => [...prev, data[0]]);
    }
  };

  const updateSection = async (id: string, updates: Partial<TaskSection>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('task_sections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();
    if (error) {
      console.error('Error updating section:', error);
    } else if (data) {
      setSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...data[0] } : section)));
    }
  };

  const deleteSection = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('task_sections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error('Error deleting section:', error);
    } else {
      setSections((prev) => prev.filter((section) => section.id !== id));
    }
  };

  const reorderSections = async (updates: { id: string; order: number }[]) => {
    if (!user) return;
    // This would typically involve a Supabase RPC function or multiple updates
    // For simplicity, we'll just update the local state and re-fetch
    // In a real app, you'd have a dedicated RPC for efficient reordering
    await Promise.all(updates.map(update => 
      supabase.from('task_sections')
        .update({ order: update.order })
        .eq('id', update.id)
        .eq('user_id', user.id)
    ));
    fetchSections(); // Re-fetch to ensure correct order
  };

  const updateSectionIncludeInFocusMode = async (id: string, include: boolean) => {
    await updateSection(id, { include_in_focus_mode: include });
  };

  return {
    sections,
    loading,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    updateSectionIncludeInFocusMode,
  };
};