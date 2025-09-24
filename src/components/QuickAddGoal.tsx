import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoalType, Category, NewGoalData } from '@/hooks/useResonanceGoals';
import { showError } from '@/utils/toast'; // Keep showError for basic validation

interface QuickAddGoalProps {
  goalType: GoalType;
  onAddGoal: (goalData: NewGoalData) => Promise<any>;
  allCategories: Category[];
  isDemo?: boolean;
  parentGoalId?: string | null;
  onAddCategory: (name: string, color: string) => Promise<Category | null>;
}

const QuickAddGoal: React.FC<QuickAddGoalProps> = ({
  goalType,
  onAddGoal,
  allCategories,
  isDemo = false,
  parentGoalId = null,
  // onAddCategory is no longer directly used for AI-driven category creation, but kept if needed elsewhere
}) => {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showError('Goal title cannot be empty.');
      return;
    }
    if (isDemo) return;

    setIsSaving(true);

    try {
      // Use the first available category as a default if no specific category is chosen
      const defaultCategoryId = allCategories[0]?.id || null;

      const goalDataToSend: NewGoalData = {
        title: title.trim(),
        description: null, // No AI suggestions, so description is null by default
        category_id: defaultCategoryId,
        type: goalType,
        due_date: null, // No AI suggestions, so due_date is null by default
        parent_goal_id: parentGoalId,
        order: null, // Default order to null
        completed: false, // Default completed to false
      };

      const success = await onAddGoal(goalDataToSend);
      if (success) {
        setTitle('');
      }
    } catch (error) {
      showError('An error occurred while adding the goal.');
      console.error('QuickAddGoal error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 py-1">
      <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Input
        placeholder={`Add a ${goalType} goal and press Enter...`}
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
        {isSaving ? <span className="animate-spin h-3.5 w-3.5 border-b-2 border-primary rounded-full" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </form>
  );
};

export default QuickAddGoal;