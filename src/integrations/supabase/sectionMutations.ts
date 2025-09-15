import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { QueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/utils/toast';
import { TaskSection } from '@/hooks/useTasks';
import { arrayMove } from '@dnd-kit/sortable';

interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  sections: TaskSection[];
}

export const createSectionMutation = async (
  name: string,
  { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries, sections }: MutationContext
) => {
  const newOrder = sections.length;
  const tempSectionId = uuidv4();
  inFlightUpdatesRef.current.add(tempSectionId);
  try {
    queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
      return oldSections ? [...oldSections, { id: tempSectionId, name, user_id: userId, order: newOrder, include_in_focus_mode: true }] : [{ id: tempSectionId, name, user_id: userId, order: newOrder, include_in_focus_mode: true }];
    });

    const { error } = await supabase
      .from('task_sections')
      .insert({ name, user_id: userId, order: newOrder, include_in_focus_mode: true })
      .select()
      .single();
    if (error) throw error;
    showSuccess('Section created!');
    invalidateSectionsQueries();
  } catch (e: any) {
    showError('Failed to create section.');
    console.error('Error creating section:', e.message);
    invalidateSectionsQueries();
  } finally {
    setTimeout(() => {
      inFlightUpdatesRef.current.delete(tempSectionId);
    }, 1500);
  }
};

export const updateSectionMutation = async (
  sectionId: string,
  newName: string,
  { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries }: MutationContext
) => {
  inFlightUpdatesRef.current.add(sectionId);
  queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
    return oldSections?.map(s => s.id === sectionId ? { ...s, name: newName } : s) || [];
  });

  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ name: newName })
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) throw error;
    showSuccess('Section updated!');
    invalidateSectionsQueries();
  } catch (e: any) {
    showError('Failed to update section.');
    console.error(`Error updating section ${sectionId}:`, e.message);
    invalidateSectionsQueries();
  } finally {
    setTimeout(() => {
      inFlightUpdatesRef.current.delete(sectionId);
    }, 1500);
  }
};

export const deleteSectionMutation = async (
  sectionId: string,
  { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries, invalidateTasksQueries }: MutationContext
) => {
  inFlightUpdatesRef.current.add(sectionId);
  queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
    return oldSections?.filter(s => s.id !== sectionId) || [];
  });
  queryClient.setQueryData(['tasks', userId], (oldTasks: any[] | undefined) => { // Use any[] for oldTasks to avoid circular dependency with Task type
    return oldTasks?.map(t => t.section_id === sectionId ? { ...t, section_id: null } : t) || [];
  });

  try {
    await supabase
      .from('tasks')
      .update({ section_id: null })
      .eq('section_id', sectionId)
      .eq('user_id', userId);

    const { error } = await supabase
      .from('task_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) throw error;
    showSuccess('Section deleted!');
    invalidateSectionsQueries();
    invalidateTasksQueries();
  }
  catch (e: any) {
    showError('Failed to delete section.');
    console.error(`Error deleting section ${sectionId}:`, e.message);
    invalidateSectionsQueries();
    invalidateTasksQueries();
  } finally {
    setTimeout(() => {
      inFlightUpdatesRef.current.delete(sectionId);
    }, 1500);
  }
};

export const updateSectionIncludeInFocusModeMutation = async (
  sectionId: string,
  include: boolean,
  { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries }: MutationContext
) => {
  inFlightUpdatesRef.current.add(sectionId);
  queryClient.setQueryData(['task_sections', userId], (oldSections: TaskSection[] | undefined) => {
    return oldSections?.map(s => s.id === sectionId ? { ...s, include_in_focus_mode: include } : s) || [];
  });

  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ include_in_focus_mode: include })
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) throw error;
    showSuccess('Focus mode setting updated!');
    invalidateSectionsQueries();
  } catch (e: any) {
    showError('Failed to update focus mode setting.');
    console.error(`Error updating focus mode for section ${sectionId}:`, e.message);
    invalidateSectionsQueries();
  } finally {
    setTimeout(() => {
      inFlightUpdatesRef.current.delete(sectionId);
    }, 1500);
  }
};

export const reorderSectionsMutation = async (
  activeId: string,
  overId: string,
  newOrderedSections: TaskSection[],
  { userId, queryClient, inFlightUpdatesRef, invalidateSectionsQueries }: MutationContext
) => {
  const updates = newOrderedSections.map((s, i) => ({
    id: s.id,
    name: s.name,
    order: i,
    user_id: userId,
    include_in_focus_mode: s.include_in_focus_mode,
  }));

  const updatedIds = updates.map(s => s.id);
  updatedIds.forEach(id => inFlightUpdatesRef.current.add(id));

  queryClient.setQueryData(['task_sections', userId], newOrderedSections);

  try {
    const { error } = await supabase.rpc('update_sections_order', { updates: updates });
    if (error) throw error;
    showSuccess('Sections reordered!');
    invalidateSectionsQueries();
  } catch (e: any) {
    showError('Failed to reorder sections.');
    console.error('Error reordering sections:', e.message);
    invalidateSectionsQueries();
  } finally {
    setTimeout(() => {
      updatedIds.forEach(id => inFlightUpdatesRef.current.delete(id));
    }, 1500);
  }
};