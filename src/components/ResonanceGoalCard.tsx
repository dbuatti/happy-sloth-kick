import React from 'react';
import { Goal } from '@/hooks/useResonanceGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, isPast, isSameDay, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Edit, Trash2, CalendarDays, Target, ChevronRight, Plus } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from '@/components/ui/button'; // Import Button for "Add Sub-goal"

interface ResonanceGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onToggleComplete: (goalId: string, completed: boolean) => void;
  onAddSubGoal: (parentGoalId: string) => void; // New prop for adding sub-goals
  subGoals: Goal[]; // New prop for direct sub-goals
  isExpanded: boolean; // New prop for expand/collapse
  toggleExpand: (goalId: string) => void; // New prop for expand/collapse handler
  isDemo?: boolean;
  level?: number; // New prop for indentation level
}

const ResonanceGoalCard: React.FC<ResonanceGoalCardProps> = ({
  goal,
  onEdit,
  onDelete,
  onToggleComplete,
  onAddSubGoal,
  subGoals,
  isExpanded,
  toggleExpand,
  isDemo = false,
  level = 0,
}) => {
  const isOverdue = goal.due_date && !goal.completed && isPast(parseISO(goal.due_date)) && !isSameDay(parseISO(goal.due_date), new Date());
  const isDueToday = goal.due_date && !goal.completed && isSameDay(parseISO(goal.due_date), new Date());

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (!isValid(date)) return null;

    if (isSameDay(date, new Date())) {
      return 'Today';
    } else if (isPast(date) && !isSameDay(date, new Date())) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MMM d');
    }
  };

  const hasSubGoals = subGoals.length > 0;

  return (
    <div style={{ marginLeft: `${level * 16}px` }}> {/* Indentation for sub-goals */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            className={cn(
              "relative group w-full shadow-sm rounded-lg transition-all duration-200 ease-in-out overflow-hidden", // Adjusted shadow, rounded, and padding
              "border-l-4",
              goal.completed ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-md", // Adjusted hover shadow
              isOverdue && "border-destructive",
              isDueToday && "border-orange-500",
              isDemo && "opacity-70 cursor-not-allowed"
            )}
          >
            <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: goal.category_color, opacity: goal.completed ? 0.1 : 0.05 }} />

            <CardHeader className="flex flex-row items-center justify-between py-2 pr-3 relative z-10"> {/* Adjusted vertical padding */}
              <div className="flex items-center gap-2"> {/* Reduced gap */}
                {hasSubGoals && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7" // Reduced size
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleExpand(goal.id);
                    }}
                    aria-label={isExpanded ? 'Collapse sub-goals' : 'Expand sub-goals'}
                  >
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform duration-200", // Reduced icon size
                      isExpanded ? "rotate-90" : "rotate-0"
                    )} />
                  </Button>
                )}
                <Checkbox
                  id={`goal-${goal.id}`}
                  checked={goal.completed}
                  onCheckedChange={(checked: boolean) => onToggleComplete(goal.id, checked)}
                  disabled={isDemo}
                  className="h-4 w-4 rounded-full border-2" // Reduced size
                />
                <CardTitle className={cn(
                  "text-base font-semibold line-clamp-1", // Reduced font size, line-clamp-1
                  goal.completed && "line-through text-muted-foreground"
                )}>
                  {goal.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-0 pb-2 px-4 space-y-1"> {/* Adjusted vertical padding */}
              {goal.description && (
                <p className={cn(
                  "text-xs text-muted-foreground line-clamp-1", // Reduced font size, line-clamp-1
                  goal.completed && "line-through"
                )}>
                  {goal.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" /> {/* Reduced icon size */}
                  <span className="capitalize">{goal.type} Goal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.category_color }} />
                  <span>{goal.category_name}</span>
                </div>
              </div>
              {goal.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" /> {/* Reduced icon size */}
                  <span className={cn(
                    isOverdue && "text-destructive",
                    isDueToday && "text-orange-500"
                  )}>
                    Due: {getDueDateDisplay(goal.due_date)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        {!isDemo && (
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => onEdit(goal)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Goal
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onAddSubGoal(goal.id)}>
              <Plus className="mr-2 h-4 w-4" /> Add Sub-goal
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onDelete(goal.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Goal
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>

      {hasSubGoals && isExpanded && (
        <div className="ml-4 mt-2 space-y-2 border-l border-border pl-4">
          {subGoals.map(subGoal => (
            <ResonanceGoalCard
              key={subGoal.id}
              goal={subGoal}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
              onAddSubGoal={onAddSubGoal}
              subGoals={[]} // Sub-goals don't have sub-goals in this simplified view
              isExpanded={false} // Sub-goals are not expandable in this view
              toggleExpand={() => {}}
              isDemo={isDemo}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ResonanceGoalCard;