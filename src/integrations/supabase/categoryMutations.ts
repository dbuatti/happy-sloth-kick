import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { MutationContext, Category } from '@/hooks/useTasks';

export const createCategoryMutation = async (name: string, color: string, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateCategoriesQueries } = context;

  const tempId = `temp-category-${Date.now()}`;
  const optimisticCategory: Category = {
    id: tempId,
    user_id: userId,
    name,
    color,
    created_at: new Date().toISOString(),
  };

  queryClient.setQueryData(['task_categories', userId], (old: Category[] | undefined) => [...(old || []), optimisticCategory]);
  inFlightUpdatesRef.current.add(tempId);

  try {
    const { data, error } = await supabase
      .from('task_categories')
      .insert({ user_id: userId, name, color })
      .select()
      .single();

    if (error) throw error;

    queryClient.setQueryData(['task_categories', userId], (old: Category[] | undefined) =>
      (old || []).map(cat => (cat.id === tempId ? data : cat))
    );
    showSuccess('Category created successfully!');
    return data.id;
  } catch (error: any) {
    showError('Failed to create category.');
    console.error('Error creating category:', error.message);
    queryClient.setQueryData(['task_categories', userId], (old: Category[] | undefined) => (old || []).filter(cat => cat.id !== tempId));
    return null;
  } finally {
    inFlightUpdatesRef.current.delete(tempId);
    invalidateCategoriesQueries();
  }
};

export const updateCategoryMutation = async (categoryId: string, updates: Partial<Category>, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateCategoriesQueries } = context;

  const previousCategories = (queryClient.getQueryData(['task_categories', userId]) as Category[] || []);
  const previousCategory = previousCategories.find(cat => cat.id === categoryId);

  if (!previousCategory) {
    showError('Category not found for update.');
    return false;
  }

  queryClient.setQueryData(['task_categories', userId], (old: Category[] | undefined) =>
    (old || []).map(cat => (cat.id === categoryId ? { ...cat, ...updates } : cat))
  );
  inFlightUpdatesRef.current.add(categoryId);

  try {
    const { error } = await supabase
      .from('task_categories')
      .update(updates)
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Category updated successfully!');
    return true;
  } catch (error: any) {
    showError('Failed to update category.');
    console.error('Error updating category:', error.message);
    queryClient.setQueryData(['task_categories', userId], previousCategories);
    return false;
  } finally {
    inFlightUpdatesRef.current.delete(categoryId);
    invalidateCategoriesQueries();
  }
};

export const deleteCategoryMutation = async (categoryId: string, context: MutationContext) => {
  const { userId, queryClient, inFlightUpdatesRef, invalidateCategoriesQueries } = context;

  const previousCategories = (queryClient.getQueryData(['task_categories', userId]) as Category[] || []);
  queryClient.setQueryData(['task_categories', userId], (old: Category[] | undefined) => (old || []).filter(cat => cat.id !== categoryId));
  inFlightUpdatesRef.current.add(categoryId);

  try {
    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;

    showSuccess('Category deleted successfully!');
    return true;
  } catch (error: any) {
    showError('Failed to delete category.');
    console.error('Error deleting category:', error.message);
    queryClient.setQueryData(['task_categories', userId], previousCategories);
    return false;
  } finally {
    inFlightUpdatesRef.current.delete(categoryId);
    invalidateCategoriesQueries();
  }
};