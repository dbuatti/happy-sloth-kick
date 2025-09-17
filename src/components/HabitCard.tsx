import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, MoreHorizontal, Edit, Flame, Info, Pencil as PencilIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithLogs } from '@/hooks/useHabits';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { isSameDay } from 'date-fns';
import { useSound } from '@/context/SoundContext';
import { Input } from '@/components/ui/input';
import { getHabitChallengeSuggestion } from '@/integrations/supabase/habit-api';
import { useAuth } from '@/context/AuthContext';
import { showLoading, dismissToast, showError } from '@/utils/toast';
import HabitChallengeDialog from './HabitChallengeDialog';
import HabitIconDisplay from './HabitIconDisplay';
import { Progress } from './Progress'; // Import the Progress component
import HabitHistoryGrid from './HabitHistoryGrid'; // Import the HabitHistoryGrid
import HabitInfoDialog from './HabitInfoDialog'; // Import the new HabitInfoDialog

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
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false); // New state for info dialog

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
        "relative group shadow-lg rounded-xl transition-all duration-200 ease-in-out overflow-hidden p-4",
        completedToday ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-xl",
        isDemo && "opacity-70 cursor-not-allowed"
      )}>
        <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: habit.color, opacity: completedToday ? 0.1 : 0.05 }} />
        <CardHeader className="flex flex-col items-center justify-center space-y-2 pb-2 relative z-10">
          <HabitIconDisplay iconName={habit.icon} color={habit.color} size="lg" />
          <CardTitle className="text-xl font-bold text-center flex items-center gap-2">
            {habit.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 pt-0 flex flex-col">
          {showProgressSection && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
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
          <div className="w-full flex mb-4 px-1"> {/* Removed justify-center and gap-1, added px-1 */}
            <HabitHistoryGrid
              habitLogs={habit.logs}
              habitStartDate={habit.start_date}
              habitColor={habit.color}
              currentDate={currentDate}
            />
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
            {!isDemo && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => setIsInfoDialogOpen(true)}> {/* New Info button */}
                    <Info className="mr-2 h-4 w-4" /> View Info
                  </DropdownMenuItem>
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
            {isRecordingValue && !completedToday ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={recordedValue}
                  onChange={(e) => setRecordedValue(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Value"
                  className="w-24 h-9 text-base rounded-xl"
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
                  className="h-10 w-10 rounded-full flex-shrink-0"
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
                  "h-12 w-12 rounded-full flex-shrink-0 shadow-md",
                  completedToday ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                size="icon"
              >
                {isSaving ? (
                  <span className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" />
                ) : completedToday ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : showProgressSection ? (
                  <PencilIcon className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
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
      <HabitInfoDialog
        isOpen={isInfoDialogOpen}
        onClose={() => setIsInfoDialogOpen(false)}
        habit={habit}
      />
    </>
  );
};

export default HabitCard;