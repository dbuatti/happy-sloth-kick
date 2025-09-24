import React, { useMemo, useCallback } from 'react';
import { Goal, GoalType, Category, NewGoalData } from '@/hooks/useResonanceGoals';
import ResonanceGoalCard from './ResonanceGoalCard';
import QuickAddGoal from './QuickAddGoal';
import { Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ResonanceGoalTimelineSectionProps {
  goalType: GoalType;
  goals: Goal[]; // This now contains ALL goals of this type, including sub-goals
  allGoals: Goal[]; // All goals from the page, for filtering
  allCategories: Category[];
  onAddGoal: (goalData: NewGoalData) => Promise<any>;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleCompleteGoal: (goalId: string, completed: boolean) => void;
  onAddSubGoal: (parentGoalId: string) => void;
  isDemo?: boolean;
  loading: boolean;
  expandedGoals: Record<string, boolean>;
  toggleExpandGoal: (goalId: string) => void;
  onAddCategory: (name: string, color: string) => Promise<Category | null>;
}

const ResonanceGoalTimelineSection: React.FC<ResonanceGoalTimelineSectionProps> = ({
  goalType,
  goals: allGoalsOfType, // Renamed to clarify it's all goals of this type
  allGoals, // Use this for filtering
  allCategories,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  onToggleCompleteGoal,
  onAddSubGoal,
  isDemo = false,
  loading,
  expandedGoals,
  toggleExpandGoal,
  onAddCategory,
}) => {
  // Filter top-level goals from the *entire* list of goals, matching the current goalType
  const topLevelGoals = useMemo(() => {
    return allGoals.filter(goal => 
      goal.parent_goal_id === null && goal.type === goalType
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allGoals, goalType]);

  // Function to get sub-goals for a given parent goal ID from the *entire* list of goals
  const getSubGoals = useCallback((parentGoalId: string) => {
    return allGoals.filter(goal => goal.parent_goal_id === parentGoalId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allGoals]);

  return (
    <div className="space-y-3 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" /> {(goalType as string).charAt(0).toUpperCase() + (goalType as string).slice(1).replace('-', ' ')} Goals
      </h3>
      <div className="relative">
        <div className="absolute left-0 top-1/2 w-full border-t border-dashed border-muted-foreground/30" />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : topLevelGoals.length === 0 ? (
        <p className="text-muted-foreground text-xs text-center py-3">No {(goalType as string).replace('-', ' ')} goals set yet.</p>
      ) : (
        <div className="space-y-3">
          {topLevelGoals.map(goal => (
            <ResonanceGoalCard
              key={goal.id}
              goal={goal}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              onToggleComplete={onToggleCompleteGoal}
              onAddSubGoal={onAddSubGoal}
              subGoals={getSubGoals(goal.id)} // Pass correctly filtered sub-goals
              isExpanded={expandedGoals[goal.id] !== false}
              toggleExpand={toggleExpandGoal}
              isDemo={isDemo}
              level={0}
            />
          ))}
        </div>
      )}
      <div className="mt-3">
        <QuickAddGoal
          goalType={goalType}
          onAddGoal={onAddGoal}
          allCategories={allCategories}
          isDemo={isDemo}
          onAddCategory={onAddCategory}
          parentGoalId={null} // Quick add always adds top-level goals
        />
      </div>
    </div>
  );
};

export default ResonanceGoalTimelineSection;