import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, MoreHorizontal, Edit, Flame, CalendarDays, Pencil as PencilIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithLogs } from '@/hooks/useHabits';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, parseISO, isSameDay, eachDayOfInterval, subDays, isBefore, startOfDay } from 'date-fns';
import { useSound } from '@/context/SoundContext';
import { Input } from '@/components/ui/input';
import { getHabitChallengeSuggestion } from '@/integrations/supabase/habit-api';
import { useAuth } from '@/context/AuthContext';
import { showLoading, dismissToast, showError } from '@/utils/toast';
import HabitChallengeDialog from './HabitChallengeDialog';
import HabitIconDisplay from './HabitIconDisplay';
import { Progress } from './Progress'; // Import the Progress component
import HabitHistoryGrid from './HabitHistoryGrid'; // Import the HabitHistoryGrid

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
    return habit.currentDayRecordedValue ?? '';
  });
  const [isRecordingValue, setIsRecordingValue] = useState(false);
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [challengeSuggestion, setChallengeSuggestion] = useState<string | null>(null);

  useEffect(() => {
    setRecordedValue(habit.currentDayRecordedValue ?? '');
  }, [currentDate, habit.currentDayRecordedValue]);

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
      case 'steps': return `${value} steps`;
      default: return `${value} ${formattedUnit}`;
    }
  };

  const completedToday = habit.completedToday;

  const handleToggleCompletionForDay = async (date: Date, isCompleted: boolean, value: number | null = null) => {
    if (isDemo) return;
    setIsSaving(true);
    const success = await onToggleCompletion(habit.id, date, isCompleted, value);
    if (success && isSameDay(date, currentDate) && isCompleted) {
      playSound('success');
      setShowCompletionEffect(true);
      setTimeout(() => setShowCompletionEffect(false), 600);
    } else if (success && isSameDay(date, currentDate) && !isCompleted) {
      playSound('reset');
      setRecordedValue('');
    }
    setIsSaving(false);
    setIsRecordingValue(false);
  };

  const handleMainCompletionButtonClick = () => {
    if (isDemo) return;

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
      setIsChallengeDialogOpen(true);
    } else {
      showError('Failed to get challenge suggestion. Please try again.');
    }
  };

  const showProgressSection = habit.target_value !== null && habit.unit !== null && habit.unit !== 'none-unit';
  const progressValue = showProgressSection && habit.target_value ? ((habit.currentDayRecordedValue || 0) / habit.target_value) * 100 : 0;

  return (
    <>
      <Card className={cn(
        "relative group shadow-lg rounded-xl transition-all duration-200 ease-in-out overflow-hidden p-4 flex", // Added flex to make it horizontal
        completedToday ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-xl",
        isDemo && "opacity-70 cursor-not-allowed"
      )}>
        <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: habit.color, opacity: completedToday ? 0.1 : 0.05 }} />
        
        {/* Left Section: Icon and Main Action Button */}
        <div className="flex flex-col items-center justify-between pr-4 relative z-10 flex-shrink-0">
          <HabitIconDisplay iconName={habit.icon} color={habit.color} size="md" />
          <div className="mt-auto"> {/* Pushes button to the bottom */}
            {isRecordingValue && !completedToday ? (
              <div className="flex flex-col items-center gap-1">
                <Input
                  type="number"
                  value={recordedValue}
                  onChange={(e) => setRecordedValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Val"
                  className="w-16 h-8 text-sm rounded-md"
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
                  className="h-8 w-8 rounded-full flex-shrink-0"
                  size="icon"
                >
                  {isSaving ? (
                    <span className="animate-spin h-3 w-3 border-b-2 border-white rounded-full" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleMainCompletionButtonClick}
                disabled={isSaving || isDemo}
                className={cn(
                  "h-10 w-10 rounded-full flex-shrink-0 shadow-md",
                  completedToday ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                size="icon"
              >
                {isSaving ? (
                  <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                ) : completedToday ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : showProgressSection ? (
                  <PencilIcon className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right Section: Details, Progress, History */}
        <div className="flex-grow flex flex-col relative z-10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {habit.name}
              {(habit.currentStreak > 0 || habit.longestStreak > 0) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {habit.currentStreak > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5 text-orange-500" /> {habit.currentStreak}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Current Streak</TooltipContent>
                    </Tooltip>
                  )}
                  {habit.longestStreak > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5 text-orange-500" /> {habit.longestStreak} (Max)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Longest Streak</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </CardTitle>
            {!isDemo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreHorizontal className="h-5 w-5" />
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
          </CardHeader>
          <CardContent className="p-0 flex-grow flex flex-col justify-between">
            <div className="space-y-1 text-sm text-muted-foreground mb-2">
              {habit.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="line-clamp-1">{habit.description}</p>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {habit.description}
                  </TooltipContent>
                </Tooltip>
              )}
              <p className="flex items-center gap-1 text-xs">
                <CalendarDays className="h-3 w-3" /> Started: {format(parseISO(habit.start_date), 'MMM d, yyyy')}
              </p>
            </div>

            {showProgressSection && (
              <div className="mb-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-primary">
                    {getUnitDisplay(habit.currentDayRecordedValue || 0, habit.unit)} / {getUnitDisplay(habit.target_value, habit.unit)}
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  className="h-2 rounded-full"
                  indicatorClassName={completedToday ? "bg-green-500" : "bg-primary"}
                />
              </div>
            )}

            {/* Habit History Grid */}
            <div className="flex items-center justify-start gap-1 mt-auto pt-2 border-t border-border">
              <HabitHistoryGrid
                habitLogs={habit.logs}
                habitStartDate={habit.start_date}
                habitColor={habit.color}
                currentDate={currentDate}
                daysToShow={90} // Display 90 days of history
              />
            </div>
          </CardContent>
        </div>
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