import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/utils/toast';
import { TaskSection } from '@/hooks/useTasks';

// Define a more comprehensive MutationContext interface for sections
interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  sections: TaskSection[];
}

// Helper to add/remove section from in-flight updates
const trackInFlight = (id: string, inFlightUpdatesRef: React.MutableRefObject<Set<string>>, action: 'add' | 'remove') => {
  if (action === 'add') {
    inFlightUpdatesRef.current.add(id);
  } else {
    inFlightUpdatesRef.current.delete(id);
  }
};

export const createSectionMutation = async (
  name: string,
  { userId, inFlightUpdatesRef, invalidateSectionsQueries, sections }: MutationContext
): Promise<void> => {
  trackInFlight('create-section-temp', inFlightUpdatesRef, 'add');
  try {
    const { error } = await supabase
      .from('task_sections')
      .insert({ name, user_id: userId, order: sections.length });
    if (error) throw error;
    showSuccess('Section created successfully!');
    invalidateSectionsQueries();
  } catch (err: any) {
    showError('Failed to create section.');
    console.error('Error creating section:', err.message);
  } finally {
    trackInFlight('create-section-temp', inFlightUpdatesRef, 'remove');
  }
};

export const updateSectionMutation = async (
  sectionId: string,
  newName: string,
  { userId, inFlightUpdatesRef, invalidateSectionsQueries }: MutationContext
): Promise<void> => {
  trackInFlight(sectionId, inFlightUpdatesRef, 'add');
  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ name: newName })
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) throw error;
    showSuccess('Section updated successfully!');
    invalidateSectionsQueries();
  } catch (err: any) {
    showError('Failed to update section.');
    console.error('Error updating section:', err.message);
  } finally {
    trackInFlight(sectionId, inFlightUpdatesRef, 'remove');
  }
};

export const deleteSectionMutation = async (
  sectionId: string,
  { userId, inFlightUpdatesRef, invalidateSectionsQueries, invalidateTasksQueries }: MutationContext
): Promise<void> => {
  trackInFlight(sectionId, inFlightUpdatesRef, 'add');
  try {
    // First, set tasks in this section to null
    const { error: updateTasksError } = await supabase
      .from('tasks')
      .update({ section_id: null })
      .eq('section_id', sectionId)
      .eq('user_id', userId);
    if (updateTasksError) throw updateTasksError;

    // Then delete the section
    const { error } = await supabase
      .from('task_sections')
      .delete()
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) throw error;

    showSuccess('Section deleted successfully!');
    invalidateSectionsQueries();
    invalidateTasksQueries(); // Invalidate tasks as their section_id might have changed
  } catch (err: any) {
    showError('Failed to delete section.');
    console.error('Error deleting section:', err.message);
  } finally {
    trackInFlight(sectionId, inFlightUpdatesRef, 'remove');
  }
};

export const updateSectionIncludeInFocusModeMutation = async (
  sectionId: string,
  include: boolean,
  { userId, inFlightUpdatesRef, invalidateSectionsQueries }: MutationContext
): Promise<void> => {
  trackInFlight(sectionId, inFlightUpdatesRef, 'add');
  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ include_in_focus_mode: include })
      .eq('id', sectionId)
      .eq('user_id', userId);
    if (error) throw error;
    showSuccess('Section focus mode setting updated!');
    invalidateSectionsQueries();
  } catch (err: any) {
    showError('Failed to update section focus mode setting.');
    console.error('Error updating section focus mode:', err.message);
  } finally {
    trackInFlight(sectionId, inFlightUpdatesRef, 'remove');
  }
};

export const reorderSectionsMutation = async (
  _activeId: string, // Unused, but kept for consistency with dnd-kit event
  _overId: string,   // Unused, but kept for consistency with dnd-kit event
  newOrderedSections: TaskSection[],
  { userId, inFlightUpdatesRef, invalidateSectionsQueries }: MutationContext
): Promise<void> => {
  // We don't track activeId here as the entire list is updated
  try {
    const updates = newOrderedSections.map((section, index) => ({
      id: section.id,
      order: index,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('task_sections')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    showSuccess('Sections reordered!');
    invalidateSectionsQueries();
  } catch (err: any) {
    showError('Failed to reorder sections.');
    console.error('Error reordering sections:', err.message);
  }
};