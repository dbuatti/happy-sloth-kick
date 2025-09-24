import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoalType, Category, NewGoalData } from '@/hooks/useResonanceGoals';
import { showError } from '@/utils/toast';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns'; // Import date-fns utilities

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
      const defaultCategoryId = allCategories[0]?.id || null;
      const today = new Date();
      let calculatedDueDate: Date | null = null;

      // Calculate due date based on goal type
      switch (goalType) {
        case 'daily':
          calculatedDueDate = addDays(today, 1); // Tomorrow
          break;
        case 'weekly':
          calculatedDueDate = addWeeks(today, 1);
          break;
        case 'monthly':
          calculatedDueDate = addMonths(today, 1);
          break;
        case '3-month':
          calculatedDueDate = addMonths(today, 3);
          break;
        case '6-month':
          calculatedDueDate = addMonths(today, 6);
          break;
        case '9-month':
          calculatedDueDate = addMonths(today, 9);
          break;
        case 'yearly':
          calculatedDueDate = addYears(today, 1);
          break;
        case '3-year':
          calculatedDueDate = addYears(today, 3);
          break;
        case '5-year':
          calculatedDueDate = addYears(today, 5);
          break;
        case '7-year':
          calculatedDueDate = addYears(today, 7);
          break;
        case '10-year':
          calculatedDueDate = addYears(today, 10);
          break;
        default:
          calculatedDueDate = null;
          break;
      }

      const goalDataToSend: NewGoalData = {
        title: title.trim(),
        description: null,
        category_id: defaultCategoryId,
        type: goalType,
        due_date: calculatedDueDate ? format(calculatedDueDate, 'yyyy-MM-dd') : null, // Assign calculated due date
        parent_goal_id: parentGoalId,
        order: null,
        completed: false,
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