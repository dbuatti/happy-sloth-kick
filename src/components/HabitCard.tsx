import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, MoreHorizontal, Edit, Flame, CalendarDays, Clock, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithLogs } from '@/hooks/useHabits';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, parseISO } from 'date-fns';
import { useSound } from '@/context/SoundContext';
import { Input } from '@/components/ui/input';
import { getHabitChallengeSuggestion } from '@/integrations/supabase/habit-challenge-api';
import { useAuth } from '@/context/AuthContext';
import { showLoading, dismissToast, showError } from '@/utils/toast';
import HabitChallengeDialog from './HabitChallengeDialog';
import HabitIconDisplay from './HabitIconDisplay'; // Import new component
import HabitHistoryGrid from './HabitHistoryGrid'; // Import new component
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Re-added Tooltip imports

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
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [challengeSuggestion, setChallengeSuggestion] = useState<string | null>(null);

  // Re-introduce displayedRecordedValue as a useMemo
  const displayedRecordedValue = useMemo(() => {
    const log = habit.logs.find(l => l.log_date === format(currentDate, 'yyyy-MM-dd'));
    return log?.value_recorded ?? null;
  }, [habit.logs, currentDate]);

  useEffect(() => {
    const log = habit.logs.find(l => l.log_date === format(currentDate, 'yyyy-MM-dd'));
    setRecordedValue(log?.value_recorded ?? '');
  }, [currentDate, habit.logs]);

  const getUnitDisplay = (value: number | null, unit: string | null) => {
    if (value === null || unit === null || unit === '') return '';
    
    let formattedUnit = unit;
    if (value > 1 && !unit.endsWith('s') && unit !== 'reps' && unit !== 'times') {
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
      default: return `${value} ${formattedUnit}`;
    }
  };

  const currentDayLog = habit.logs.find(l => l.log_date === format(currentDate, 'yyyy-MM-dd'));
  const completedToday = currentDayLog?.is_completed ?? false;

  const handleToggleCompletionForDay = async (date: Date, isCompleted: boolean, value: number | null = null) => {
    if (isDemo) return;
    setIsSaving(true);
    const success = await onToggleCompletion(habit.id, date, isCompleted, value);
    if (success && isCompleted) { // Check isCompleted directly
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => setShowCompletionEffect(false), 600);
    } else if (success && !isCompleted) {
      playSound('reset');
      setRecordedValue('');
    }
    setIsSaving(false);
    setIsRecordingValue(false);
  };

  const handleMainCompletionButtonClick = () => {
    if (isDemo) return;

    // If habit has a target value and is not completed for currentDate, prompt for value
    if (habit.target_value && !completedToday) {
      setIsRecordingValue(true);
      return;
    }

    handleToggleCompletionForDay(currentDate, !completedToday, recordedValue === '' ? null : Number(recordedValue));
  };

  const handleRecordValueAndComplete = async () => {
    if (isDemo) return;
    await handleToggleCompletionForDay(currentDate, true, recordedValue === '' ? null : Number(recordedValue));
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
      setChallengeSuggestion(suggestion);
      setIsChallengeDialogOpen(true); // Open the dialog with the suggestion
    } else {
      showError('Failed to get challenge suggestion. Please try again.');
    }
  };

  return (
    <>
      <Card className={cn(
        "relative group shadow-lg rounded-xl transition-all duration-200 ease-in-out overflow-hidden p-4", // Added padding
        completedToday ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-xl",
        isDemo && "opacity-70 cursor-not-allowed"
      )}>
        <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: habit.color, opacity: completedToday ? 0.1 : 0.05 }} />
        <div className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HabitIconDisplay iconName={habit.icon} color={habit.color} className="h-6 w-6" />
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
                  <DropdownMenuItem onSelect={() => handleToggleCompletionForDay(currentDate, true, recordedValue === '' ? null : Number(recordedValue))} disabled={completedToday}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete (Today)
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleToggleCompletionForDay(currentDate, false)} disabled={!completedToday}>
                    <X className="mr-2 h-4 w-4" /> Mark Incomplete (Today)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <CardContent className="relative z-10 pt-0 flex flex-col">
          <div className="space-y-1 text-sm text-muted-foreground mb-3">
            {habit.description && <p className="line-clamp-2">{habit.description}</p>}
            {habit.target_value && habit.unit && (
              <p className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Target: {getUnitDisplay(habit.target_value, habit.unit)}
              </p>
            )}
            {completedToday && displayedRecordedValue !== null && (
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

          {/* Habit History Grid */}
          <HabitHistoryGrid
            habitLogs={habit.logs}
            habitStartDate={habit.start_date}
            habitColor={habit.color}
            currentDate={currentDate}
          />

          <div className="flex items-center justify-end mt-2">
            {isRecordingValue && !completedToday ? (
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
                  className={cn(
                    "h-9 w-9 rounded-full flex-shrink-0",
                    completedToday ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
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
                onClick={handleMainCompletionButtonClick}
                disabled={isSaving || isDemo}
                className={cn(
                  "h-10 w-10 rounded-full flex-shrink-0",
                  completedToday ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                size="icon"
              >
                {isSaving ? (
                  <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                ) : completedToday ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : habit.target_value && !completedToday ? (
                  <Target className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
        {showCompletionEffect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-task-complete" />
          </div>
        )}
      </Card>

      <HabitChallengeDialog
        isOpen={isChallengeDialogOpen}
        onClose={() => setIsChallengeDialogOpen(false)}
        suggestion={challengeSuggestion}
      />
    </>
  );
};

export default HabitCard;