import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { QueryClient } from '@tanstack/react-query';
import { TaskSection } from '@/hooks/useTasks';
import { trackInFlight } from './utils';

// Define MutationContext for section mutations
interface MutationContext {
  userId: string;
  queryClient: QueryClient;
  inFlightUpdatesRef: React.MutableRefObject<Set<string>>;
  invalidateTasksQueries: () => void;
  invalidateSectionsQueries: () => void;
  sections: TaskSection[]; // Added sections to context for getNextSectionOrder
}

// Helper to get the next order value for a new section
const getNextSectionOrder = (sections: TaskSection[]): number => {
  if (sections.length === 0) {
    return 0;
  }
  const maxOrder = Math.max(...sections.map(s => s.order || 0));
  return maxOrder + 1;
};

export const createSectionMutation = async (
  name: string,
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateSectionsQueries, queryClient } = context;
  const cleanup = trackInFlight('create-section', inFlightUpdatesRef);

  try {
    // Optimistically get current sections to determine the new order
    const currentSections = queryClient.getQueryData<TaskSection[]>(['task_sections', userId]) || [];

    const { error } = await supabase
      .from('task_sections')
      .insert({ name, user_id: userId, order: getNextSectionOrder(currentSections) });

    if (error) throw error;

    showSuccess('Section created successfully!');
    invalidateSectionsQueries();
  } catch (error: any) {
    showError('Failed to create section.');
    console.error('Error creating section:', error.message);
  } finally {
    cleanup();
  }
};

export const updateSectionMutation = async (
  sectionId: string,
  newName: string,
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateSectionsQueries } = context;
  const cleanup = trackInFlight(sectionId, inFlightUpdatesRef);

  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ name: newName })
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Section updated successfully!');
    invalidateSectionsQueries();
  } catch (error: any) {
    showError('Failed to update section.');
    console.error('Error updating section:', error.message);
  } finally {
    cleanup();
  }
};

export const deleteSectionMutation = async (
  sectionId: string,
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateSectionsQueries, invalidateTasksQueries } = context;
  const cleanup = trackInFlight(sectionId, inFlightUpdatesRef);

  try {
    // First, set section_id to null for all tasks in this section
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
    invalidateTasksQueries(); // Tasks changed due to section_id update
  } catch (error: any) {
    showError('Failed to delete section.');
    console.error('Error deleting section:', error.message);
  } finally {
    cleanup();
  }
};

export const updateSectionIncludeInFocusModeMutation = async (
  sectionId: string,
  include: boolean,
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateSectionsQueries } = context;
  const cleanup = trackInFlight(sectionId, inFlightUpdatesRef);

  try {
    const { error } = await supabase
      .from('task_sections')
      .update({ include_in_focus_mode: include })
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Section focus mode setting updated!');
    invalidateSectionsQueries();
  } catch (error: any) {
    showError('Failed to update section focus mode setting.');
    console.error('Error updating section focus mode setting:', error.message);
  } finally {
    cleanup();
  }
};

export const reorderSectionsMutation = async (
  activeId: string,
  newOrderedSections: TaskSection[],
  context: MutationContext
): Promise<void> => {
  const { userId, inFlightUpdatesRef, invalidateSectionsQueries } = context;
  const cleanup = trackInFlight(`reorder-section-${activeId}`, inFlightUpdatesRef);

  try {
    const updates = newOrderedSections.map((section, index) => ({
      id: section.id,
      order: index,
      user_id: userId,
      name: section.name, // Include other non-nullable fields for upsert
      include_in_focus_mode: section.include_in_focus_mode,
    }));

    const { error } = await supabase
      .from('task_sections')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    showSuccess('Sections reordered successfully!');
    invalidateSectionsQueries();
  } catch (error: any) {
    showError('Failed to reorder sections.');
    console.error('Error reordering sections:', error.message);
  } finally {
    cleanup();
  }
};