import React from 'react';
import { Goal } from '@/hooks/useResonanceGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, isPast, isSameDay, isValid } from 'date-fns';
import { cn, getContrastTextColor } from '@/lib/utils'; // Import getContrastTextColor
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

    // Format as DD MONTH YY (e.g., 24 SEPTEMBER 25)
    return format(date, 'dd MMMM yy').toUpperCase();
  };

  const hasSubGoals = subGoals.length > 0;
  const textColorClass = getContrastTextColor(goal.category_color || '#6b7280'); // Default to gray if no color

  return (
    <div style={{ marginLeft: `${level * 16}px` }}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            className={cn(
              "relative group w-full shadow-sm rounded-lg transition-all duration-200 ease-in-out overflow-hidden",
              "hover:shadow-md",
              isDemo && "opacity-70 cursor-not-allowed",
              textColorClass // Apply calculated text color
            )}
            style={{ backgroundColor: goal.category_color || '#6b7280' }} // Apply category color as background
          >
            <CardHeader className="flex flex-row items-center justify-between py-1.5 pr-3 relative z-10 h-auto">
              <div className="flex items-center gap-2 flex-grow min-w-0">
                {hasSubGoals && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6", textColorClass)} // Apply text color to button
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
                  onCheckedChange={(checked: boolean) => { console.log('Checkbox toggled for goal:', goal.id, 'new state:', checked); onToggleComplete(goal.id, checked); }}
                  disabled={isDemo}
                  className={cn("h-3.5 w-3.5 rounded-full border-2", textColorClass)} // Apply text color to checkbox
                />
                <CardTitle className={cn(
                  "text-sm font-semibold line-clamp-1 flex-grow min-w-0",
                  goal.completed && "line-through opacity-70" // Keep line-through, adjust opacity
                )}>
                  {goal.title}
                </CardTitle>
              </div >
              <div className="flex items-center gap-1 text-xs flex-shrink-0 ml-auto">
                {goal.due_date && (
                  <span className={cn(
                    "font-bold uppercase",
                    isOverdue && "text-destructive",
                    isDueToday && "text-orange-500"
                  )}>
                    {getDueDateDisplay(goal.due_date)}
                  </span>
                )}
                {goal.due_date && goal.category_name && <span className="mx-1">·</span>} {/* Separator only if both exist */}
                {goal.category_name && <span>{goal.category_name}</span>}
              </div>
              {!isDemo && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", textColorClass)} onClick={(e) => { e.stopPropagation(); console.log('Edit button clicked for goal:', goal.id); onEdit(goal); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7 text-destructive", textColorClass === 'text-white' ? 'hover:bg-white/20' : 'hover:bg-black/10')} onClick={(e) => { e.stopPropagation(); console.log('Delete button clicked for goal:', goal.id); onDelete(goal.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="relative z-10 pt-0 pb-1.5 px-4 space-y-1">
              {goal.description && (
                <p className={cn(
                  "text-xs line-clamp-1",
                  goal.completed && "line-through opacity-70"
                )}>
                  {goal.description}
                </p>
              )}
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        {!isDemo && (
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => { console.log('Context menu Edit Goal selected for:', goal.id); onEdit(goal); }}>
              <Edit className="mr-2 h-4 w-4" /> Edit Goal
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => { console.log('Context menu Add Sub-goal selected for:', goal.id); onAddSubGoal(goal.id); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Sub-goal
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => { console.log('Context menu Delete Goal selected for:', goal.id); onDelete(goal.id); }} className="text-destructive">
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