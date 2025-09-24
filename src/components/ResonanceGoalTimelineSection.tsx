import React from 'react';
import { Goal, GoalType, Category } from '@/hooks/useResonanceGoals';
import ResonanceGoalCard from './ResonanceGoalCard';
import QuickAddGoal from './QuickAddGoal';
import { Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ResonanceGoalTimelineSectionProps {
  goalType: GoalType;
  goals: Goal[];
  allCategories: Category[];
  onAddGoal: Parameters<typeof QuickAddGoal>['0']['onAddGoal']; // Corrected type
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleCompleteGoal: (goalId: string, completed: boolean) => void;
  onAddSubGoal: (parentGoalId: string) => void;
  isDemo?: boolean;
  loading: boolean;
  expandedGoals: Record<string, boolean>;
  toggleExpandGoal: (goalId: string) => void;
}

const ResonanceGoalTimelineSection: React.FC<ResonanceGoalTimelineSectionProps> = ({
  goalType,
  goals,
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
}) => {
  const topLevelGoals = goals.filter(goal => goal.parent_goal_id === null)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const getSubGoals = (parentGoalId: string) => {
    return goals.filter(goal => goal.parent_goal_id === parentGoalId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  return (
    <div className="space-y-4 border-b pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" /> {goalType.charAt(0).toUpperCase() + goalType.slice(1).replace('-', ' ')} Goals
      </h3>
      <div className="relative">
        <div className="absolute left-0 top-1/2 w-full border-t border-dashed border-muted-foreground/30" />
        <div className="relative z-10 bg-background px-2 py-1 inline-block -translate-y-1/2">
          <span className="text-sm text-muted-foreground">{goalType.replace('-', ' ')}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : topLevelGoals.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No {goalType.replace('-', ' ')} goals set yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topLevelGoals.map(goal => (
            <ResonanceGoalCard
              key={goal.id}
              goal={goal}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              onToggleComplete={onToggleCompleteGoal}
              onAddSubGoal={onAddSubGoal}
              subGoals={getSubGoals(goal.id)}
              isExpanded={expandedGoals[goal.id] !== false}
              toggleExpand={toggleExpandGoal}
              isDemo={isDemo}
              level={0}
            />
          ))}
        </div>
      )}
      <div className="mt-4">
        <QuickAddGoal
          goalType={goalType}
          onAddGoal={onAddGoal}
          allCategories={allCategories}
          isDemo={isDemo}
        />
      </div>
    </div>
  );
};

export default ResonanceGoalTimelineSection;