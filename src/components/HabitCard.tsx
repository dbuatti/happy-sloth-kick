import React, { useState } from 'react';
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, MoreHorizontal, Edit, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HabitWithLogs } from '@/hooks/useHabits';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { useSound } from '@/context/SoundContext';
import { Input } from '@/components/ui/input';
import { getHabitChallengeSuggestion } from '@/integrations/supabase/habit-challenge-api';
import { useAuth } from '@/context/AuthContext';
import { showLoading, dismissToast, showError } from '@/utils/toast';
import HabitChallengeDialog from './HabitChallengeDialog';
import HabitIconDisplay from './HabitIconDisplay'; // Import new component
import HabitHistoryGrid from './HabitHistoryGrid'; // Import new component

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

  const handleToggle = async () => {
    if (isDemo) return;

    // If habit has a target value and is not completed, prompt for value
    if (habit.target_value && !habit.completedToday) {
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
      setRecordedValue('');
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
      setChallengeSuggestion(suggestion);
      setIsChallengeDialogOpen(true);
    } else {
      showError('Failed to get challenge suggestion. Please try again.');
    }
  };

  return (
    <>
      <Card className={cn(
        "relative group shadow-lg rounded-xl transition-all duration-200 ease-in-out overflow-hidden p-4", // Added padding
        habit.completedToday ? "bg-green-500/10 border-green-500/30" : "bg-card border-border hover:shadow-xl",
        isDemo && "opacity-70 cursor-not-allowed"
      )}>
        <div className="flex items-center justify-between mb-3"> {/* Flex container for top row */}
          <HabitIconDisplay iconName={habit.icon} color={habit.color} />
          <div className="flex-1 ml-4 min-w-0"> {/* Text content */}
            <CardTitle className="text-lg font-semibold truncate">{habit.name}</CardTitle>
            {habit.description && <p className="text-sm text-muted-foreground truncate">{habit.description}</p>}
          </div>
          {!isDemo && (
            <div className="flex-shrink-0 ml-4"> {/* Completion button */}
              {isRecordingValue && !habit.completedToday ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={recordedValue}
                    onChange={(e) => setRecordedValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Value"
                    className="w-24 h-10 text-base"
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
                  onClick={handleToggle}
                  disabled={isSaving || isDemo}
                  className={cn(
                    "h-14 w-14 rounded-full flex-shrink-0", // Larger button
                    habit.completedToday ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary" // Outlined for incomplete
                  )}
                  size="icon"
                >
                  {isSaving ? (
                    <span className="animate-spin h-6 w-6 border-b-2 border-white rounded-full" />
                  ) : habit.completedToday ? (
                    <CheckCircle2 className="h-8 w-8" /> // Larger icon
                  ) : (
                    <Plus className="h-8 w-8" /> // Larger icon
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        <HabitHistoryGrid
          habitLogs={habit.logs}
          habitStartDate={habit.start_date}
          habitColor={habit.color}
          currentDate={currentDate}
        />

        {showCompletionEffect && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <CheckCircle2 className="h-16 w-16 text-green-500 animate-task-complete" />
          </div>
        )}

        {/* Dropdown menu for additional actions */}
        {!isDemo && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
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
              </DropdownMenuContent>
            </DropdownMenu>
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