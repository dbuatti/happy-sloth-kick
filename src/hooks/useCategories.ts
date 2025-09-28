"use client";

import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Category } from './useTasks'; // Assuming Category type is exported from useTasks

interface UseCategoriesProps {
  userId: string;
}

interface NewCategoryData {
  name: string;
  color: string;
}

// Define a specific context type for category mutations
interface CategoryMutationContext {
  previousCategories?: Category[];
}

export const useCategories = ({ userId }: UseCategoriesProps) => {
  const queryClient = useQueryClient();

  const invalidateCategoriesQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['task_categories', userId] });
  };

  const createCategoryMutation = useMutation<Category, Error, NewCategoryData, CategoryMutationContext>({
    mutationFn: async (newCategory: NewCategoryData) => {
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ ...newCategory, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: ['task_categories', userId] });
      const previousCategories = queryClient.getQueryData<Category[]>(['task_categories', userId]);
      
      const optimisticCategory: Category = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        user_id: userId,
        created_at: new Date().toISOString(),
        ...newCategory,
      };

      queryClient.setQueryData<Category[]>(['task_categories', userId], (old) => [...(old || []), optimisticCategory]);
      return { previousCategories };
    },
    onSuccess: (data, _variables, _context) => { // _variables and _context are unused
      showSuccess('Category created successfully!');
      queryClient.setQueryData<Category[]>(['task_categories', userId], (old) =>
        (old || []).map((cat) => (cat.id.startsWith('optimistic-') ? data : cat))
      );
      invalidateCategoriesQueries();
    },
    onError: (err, _newCategory, context) => { // _newCategory is unused
      showError('Failed to create category.');
      console.error('Error creating category:', err.message);
      if (context?.previousCategories) {
        queryClient.setQueryData<Category[]>(['task_categories', userId], context.previousCategories);
      }
    },
  });

  const updateCategoryMutation = useMutation<Category, Error, { id: string; updates: Partial<NewCategoryData> }, CategoryMutationContext>({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['task_categories', userId] });
      const previousCategories = queryClient.getQueryData<Category[]>(['task_categories', userId]);
      
      queryClient.setQueryData<Category[]>(['task_categories', userId], (old) =>
        (old || []).map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
      );
      return { previousCategories };
    },
    onSuccess: (_data, _variables, _context) => { // _data, _variables, _context are unused
      showSuccess('Category updated successfully!');
      invalidateCategoriesQueries();
    },
    onError: (err, _variables, context) => { // _variables is unused
      showError('Failed to update category.');
      console.error('Error updating category:', err.message);
      if (context?.previousCategories) {
        queryClient.setQueryData<Category[]>(['task_categories', userId], context.previousCategories);
      }
    },
  });

  const deleteCategoryMutation = useMutation<void, Error, string, CategoryMutationContext>({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['task_categories', userId] });
      const previousCategories = queryClient.getQueryData<Category[]>(['task_categories', userId]);
      
      queryClient.setQueryData<Category[]>(['task_categories', userId], (old) =>
        (old || []).filter((cat) => cat.id !== id)
      );
      return { previousCategories };
    },
    onSuccess: (_data, _variables, _context) => { // _data, _variables, _context are unused
      showSuccess('Category deleted successfully!');
      invalidateCategoriesQueries();
    },
    onError: (err, _id, context) => { // _id is unused
      showError('Failed to delete category.');
      console.error('Error deleting category:', err.message);
      if (context?.previousCategories) {
        queryClient.setQueryData<Category[]>(['task_categories', userId], context.previousCategories);
      }
    },
  });

  return {
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isLoading: createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending,
  };
};