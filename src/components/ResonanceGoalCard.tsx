import React from 'react';
import { Goal } from '@/hooks/useResonanceGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, isPast, isSameDay, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Edit, Trash2, CalendarDays, ChevronRight, Plus } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from '@/components/ui/button';

interface ResonanceGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onToggleComplete: (goalId: string, completed: boolean) => void;
  onAddSubGoal: (parentGoalId: string) => void;
  subGoals: Goal[];
  isExpanded: boolean;
  toggleExpand: (goalId: string) => void;
  isDemo?: boolean;
  level?: number;
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
    <div style={{ marginLeft: `${level * 16}px` }}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            className={cn(
              "relative group w-full shadow-sm rounded-lg transition-all duration-200 ease-in-out overflow-hidden",
              "border-l-4",
              goal.completed ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-md",
              isOverdue && "border-destructive",
              isDueToday && "border-orange-500",
              isDemo && "opacity-70 cursor-not-allowed"
            )}
          >
            <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: goal.category_color, opacity: goal.completed ? 0.1 : 0.05 }} />

            <CardHeader className="flex flex-row items-center justify-between py-1.5 pr-3 relative z-10 h-auto">
              <div className="flex items-center gap-2 flex-grow min-w-0">
                {hasSubGoals && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleExpand(goal.id);
                    }}
                    aria-label={isExpanded ? 'Collapse sub-goals' : 'Expand sub-goals'}
                  >
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isExpanded ? "rotate-90" : "rotate-0"
                    )} />
                  </Button>
                )}
                <Checkbox
                  id={`goal-${goal.id}`}
                  checked={goal.completed}
                  onCheckedChange={(checked: boolean) => onToggleComplete(goal.id, checked)}
                  disabled={isDemo}
                  className="h-3.5 w-3.5 rounded-full border-2"
                />
                <CardTitle className={cn(
                  "text-sm font-semibold line-clamp-1 flex-grow min-w-0",
                  goal.completed && "line-through text-muted-foreground"
                )}>
                  {goal.title}
                </CardTitle>
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                  {goal.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span className={cn(
                        isOverdue && "text-destructive",
                        isDueToday && "text-orange-500"
                      )}>
                        {getDueDateDisplay(goal.due_date)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.category_color }} />
                    <span>{goal.category_name}</span>
                  </div>
                </div>
              </div >
            </CardHeader>
            <CardContent className="relative z-10 pt-0 pb-1.5 px-4 space-y-1">
              {goal.description && (
                <p className={cn(
                  "text-xs text-muted-foreground line-clamp-1",
                  goal.completed && "line-through"
                )}>
                  {goal.description}
                </p>
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
              subGoals={[]}
              isExpanded={false}
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