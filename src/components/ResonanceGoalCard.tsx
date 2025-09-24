import React from 'react';
import { Goal } from '@/hooks/useResonanceGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, isPast, isSameDay, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Edit, Trash2, CalendarDays, Target } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"; // Import ContextMenu components

interface ResonanceGoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onToggleComplete: (goalId: string, completed: boolean) => void;
  isDemo?: boolean;
}

const ResonanceGoalCard: React.FC<ResonanceGoalCardProps> = ({ goal, onEdit, onDelete, onToggleComplete, isDemo = false }) => {
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            "relative group w-full shadow-lg rounded-xl transition-all duration-200 ease-in-out overflow-hidden",
            "border-l-4",
            goal.completed ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-xl",
            isOverdue && "border-destructive",
            isDueToday && "border-orange-500",
            isDemo && "opacity-70 cursor-not-allowed"
          )}
        >
          <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: goal.category_color, opacity: goal.completed ? 0.1 : 0.05 }} />

          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <div className="flex items-center gap-3">
              <Checkbox
                id={`goal-${goal.id}`}
                checked={goal.completed}
                onCheckedChange={(checked: boolean) => onToggleComplete(goal.id, checked)}
                disabled={isDemo}
                className="h-5 w-5 rounded-full border-2"
              />
              <CardTitle className={cn(
                "text-lg font-bold line-clamp-2",
                goal.completed && "line-through text-muted-foreground"
              )}>
                {goal.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-0 space-y-2">
            {goal.description && (
              <p className={cn(
                "text-sm text-muted-foreground line-clamp-2",
                goal.completed && "line-through"
              )}>
                {goal.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span className="capitalize">{goal.type} Goal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.category_color }} />
                <span>{goal.category_name}</span>
              </div>
            </div>
            {goal.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
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
          <ContextMenuItem onSelect={() => onDelete(goal.id)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Goal
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
};

export default ResonanceGoalCard;