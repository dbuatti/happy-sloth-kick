import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoalType, Category } from '@/hooks/useResonanceGoals';
import { suggestGoalDetails } from '@/integrations/supabase/api'; // Assuming this API function exists or will be created
import { dismissToast, showError, showLoading } from '@/utils/toast';

interface QuickAddGoalProps {
  goalType: GoalType;
  onAddGoal: (goalData: {
    title: string;
    description: string | null;
    category_id: string | null;
    type: GoalType;
    due_date: string | null;
    parent_goal_id: string | null;
  }) => Promise<any>;
  allCategories: Category[];
  isDemo?: boolean;
  parentGoalId?: string | null;
  onAddCategory: (name: string, color: string) => Promise<Category | null>; // New prop for adding categories
}

const QuickAddGoal: React.FC<QuickAddGoalProps> = ({
  goalType,
  onAddGoal,
  allCategories,
  isDemo = false,
  parentGoalId = null,
  onAddCategory, // Destructure new prop
}) => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    setIsSuggesting(true);
    const loadingToastId = showLoading('Getting AI suggestions...');

    try {
      const categoriesForAI = allCategories.map(cat => ({ id: cat.id, name: cat.name }));
      // Assuming suggestGoalDetails is similar to suggestTaskDetails
      const suggestions = await suggestGoalDetails(title.trim(), categoriesForAI, new Date());
      dismissToast(loadingToastId);
      setIsSuggesting(false);

      let goalDataToSend: Parameters<typeof onAddGoal>[0];
      let finalCategoryId: string | null = null;

      if (suggestions) {
        const existingCategory = allCategories.find(cat => cat.name.toLowerCase() === suggestions.category.toLowerCase());
        
        if (existingCategory) {
          finalCategoryId = existingCategory.id;
        } else {
          // Category does not exist, create it
          const newCategory = await onAddCategory(suggestions.category, '#6b7280'); // Default color for new AI-created categories
          if (newCategory) {
            finalCategoryId = newCategory.id;
          } else {
            showError('Failed to create new category. Using default.');
            finalCategoryId = allCategories[0]?.id || null;
          }
        }
        
        goalDataToSend = {
          title: suggestions.cleanedDescription,
          description: suggestions.notes,
          category_id: finalCategoryId,
          type: goalType,
          due_date: suggestions.dueDate,
          parent_goal_id: parentGoalId,
        };
      } else {
        showError('AI suggestions failed. Adding goal with default details.');
        goalDataToSend = {
          title: title.trim(),
          description: null,
          category_id: allCategories[0]?.id || null,
          type: goalType,
          due_date: null,
          parent_goal_id: parentGoalId,
        };
      }

      const success = await onAddGoal(goalDataToSend);
      if (success) {
        setTitle('');
      }
    } catch (error) {
      dismissToast(loadingToastId);
      showError('An error occurred while adding the goal.');
      console.error('QuickAddGoal error:', error);
    } finally {
      setIsSaving(false);
      setIsSuggesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 py-1">
      <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        placeholder={`Add a ${goalType} goal (AI-powered) and press Enter...`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        disabled={isSaving || isDemo}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" disabled={isSaving || isDemo || !title.trim()}>
        {isSuggesting ? <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" /> : <Sparkles className="h-3.5 w-3.5" />}
      </Button>
    </form>
  );
};

export default QuickAddGoal;