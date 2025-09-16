import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, MoreHorizontal, Edit, Flame, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithLogs } from '@/hooks/useHabits';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, parseISO } from 'date-fns';

interface HabitCardProps {
  habit: HabitWithLogs;
  onToggleCompletion: (habitId: string, date: Date, isCompleted: boolean, valueRecorded?: number | null) => Promise<boolean>;
  onEdit: (habit: HabitWithLogs) => void;
  currentDate: Date;
  isDemo?: boolean;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggleCompletion, onEdit, currentDate, isDemo = false }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    if (isDemo) return;
    setIsSaving(true);
    await onToggleCompletion(habit.id, currentDate, !habit.completedToday);
    setIsSaving(false);
  };

  const getUnitDisplay = (value: number | null, unit: string | null) => {
    if (value === null || unit === null) return '';
    return `${value} ${unit}`;
  };

  return (
    <Card className={cn(
      "relative group shadow-lg rounded-xl transition-all duration-200 ease-in-out",
      habit.completedToday ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-xl",
      isDemo && "opacity-70 cursor-not-allowed"
    )}>
      <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: habit.color, opacity: habit.completedToday ? 0.1 : 0.05 }} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color }} />
          {habit.name}
        </CardTitle>
        <div className="flex items-center gap-1">
          {habit.currentStreak > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center text-sm font-medium text-muted-foreground">
                  <Flame className="h-4 w-4 mr-1 text-orange-500" /> {habit.currentStreak}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Current Streak: {habit.currentStreak} days
              </TooltipContent>
            </Tooltip>
          )}
          {!isDemo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(habit)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Habit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onToggleCompletion(habit.id, currentDate, true)} disabled={habit.completedToday}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onToggleCompletion(habit.id, currentDate, false)} disabled={!habit.completedToday}>
                  <X className="mr-2 h-4 w-4" /> Mark Incomplete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-0 flex items-end justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          {habit.description && <p className="line-clamp-2">{habit.description}</p>}
          {habit.target_value && habit.unit && (
            <p className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Target: {getUnitDisplay(habit.target_value, habit.unit)}
            </p>
          )}
          <p className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Started: {format(parseISO(habit.start_date), 'MMM d, yyyy')}
          </p>
          {habit.longestStreak > 0 && (
            <p className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> Longest Streak: {habit.longestStreak} days
            </p>
          )}
        </div>
        <Button
          onClick={handleToggle}
          disabled={isSaving || isDemo}
          className={cn(
            "h-10 w-10 rounded-full flex-shrink-0",
            habit.completedToday ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
          size="icon"
        >
          {isSaving ? (
            <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
          ) : habit.completedToday ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HabitCard;