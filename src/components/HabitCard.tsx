import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, MoreHorizontal, Edit, Flame, CalendarDays, Clock, Target, Input as InputIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithLogs } from '@/hooks/useHabits';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, parseISO } from 'date-fns';
import { useSound } from '@/context/SoundContext';
import { Input } from '@/components/ui/input';
import { getHabitChallengeSuggestion } from '@/integrations/supabase/habit-api'; // Import the new API call
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast'; // Import toast utilities

interface HabitCardProps {
  habit: HabitWithLogs;
  onToggleCompletion: (habitId: string, date: Date, isCompleted: boolean, valueRecorded?: number | null) => Promise<boolean>;
  onEdit: (habit: HabitWithLogs) => void;
  currentDate: Date;
  isDemo?: boolean;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggleCompletion, onEdit, currentDate, isDemo = false }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { playSound } = useSound();
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);
  const [recordedValue, setRecordedValue] = useState<number | ''>(() => {
    const log = habit.logs.find(l => l.log_date === format(currentDate, 'yyyy-MM-dd'));
    return log?.value_recorded ?? '';
  });
  const [isRecordingValue, setIsRecordingValue] = useState(false);

  const handleToggle = async () => {
    if (isDemo) return;

    if (habit.target_value && !habit.completedToday && recordedValue === '') {
      // If habit has a target and is not completed, and no value is recorded, prompt for value
      setIsRecordingValue(true);
      return;
    }

    setIsSaving(true);
    const success = await onToggleCompletion(habit.id, currentDate, !habit.completedToday, recordedValue === '' ? null : Number(recordedValue));
    if (success && !habit.completedToday) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => setShowCompletionEffect(false), 600);
    } else if (success && habit.completedToday) {
      playSound('reset');
      setRecordedValue(''); // Clear recorded value when un-completing
    }
    setIsSaving(false);
    setIsRecordingValue(false);
  };

  const handleRecordValueAndComplete = async () => {
    if (isDemo) return;
    setIsSaving(true);
    const success = await onToggleCompletion(habit.id, currentDate, true, recordedValue === '' ? null : Number(recordedValue));
    if (success) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => setShowCompletionEffect(false), 600);
    }
    setIsSaving(false);
    setIsRecordingValue(false);
  };

  const handleSuggestChallenge = async () => {
    if (isDemo || !userId) {
      showError('AI suggestions are not available in demo mode or without a user ID.');
      return;
    }
    const loadingToastId = showLoading('Generating challenge suggestion...');
    const suggestion = await getHabitChallengeSuggestion(userId, habit.id);
    dismissToast(loadingToastId);
    if (suggestion) {
      showSuccess(suggestion);
    } else {
      showError('Failed to get challenge suggestion. Please try again.');
    }
  };

  const getUnitDisplay = (value: number | null, unit: string | null) => {
    if (value === null || unit === null || unit === '') return '';
    
    let formattedUnit = unit;
    if (value > 1 && !unit.endsWith('s') && unit !== 'reps' && unit !== 'times') { // Simple pluralization, exclude already plural or specific units
      formattedUnit += 's';
    }

    switch (unit.toLowerCase()) {
      case 'minutes': return `${value} min`;
      case 'kilometers': return `${value} km`;
      case 'miles': return `${value} mi`;
      case 'liters': return `${value} L`;
      case 'milliliters': return `${value} ml`;
      case 'glasses': return `${value} glasses`;
      case 'reps': return `${value} reps`;
      case 'pages': return `${value} pages`;
      case 'times': return `${value} times`;
      case 'steps': return `${value} steps`;
      default: return `${value} ${formattedUnit}`;
    }
  };

  const currentDayLog = habit.logs.find(l => l.log_date === format(currentDate, 'yyyy-MM-dd'));
  const displayedRecordedValue = currentDayLog?.value_recorded ?? null;

  return (
    <Card className={cn(
      "relative group shadow-lg rounded-xl transition-all duration-200 ease-in-out overflow-hidden",
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
                <DropdownMenuItem onSelect={handleSuggestChallenge}>
                  <Sparkles className="mr-2 h-4 w-4" /> Suggest Challenge
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onToggleCompletion(habit.id, currentDate, true, recordedValue === '' ? null : Number(recordedValue))} disabled={habit.completedToday}>
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
          {habit.completedToday && displayedRecordedValue !== null && (
            <p className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <Clock className="h-3.5 w-3.5" /> Logged: {getUnitDisplay(displayedRecordedValue, habit.unit)}
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
        {isRecordingValue && !habit.completedToday ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={recordedValue}
              onChange={(e) => setRecordedValue(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Value"
              className="w-24 h-9 text-base"
              min="0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRecordValueAndComplete();
                }
              }}
            />
            <Button
              onClick={handleRecordValueAndComplete}
              disabled={isSaving || isDemo || recordedValue === ''}
              className="h-9 w-9 rounded-full flex-shrink-0"
              size="icon"
            >
              {isSaving ? (
                <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </Button>
          </div>
        ) : (
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
            ) : habit.target_value && !habit.completedToday ? (
              <InputIcon className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </Button>
        )}
      </CardContent>
      {showCompletionEffect && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <CheckCircle2 className="h-16 w-16 text-green-500 animate-task-complete" />
        </div>
      )}
    </Card>
  );
};

export default HabitCard;