import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { XCircle, CheckCircle2, Timer as TimerIcon, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/Progress';
import { useTimer } from '@/hooks/useTimer'; // Import useTimer
import { useFocusSessions } from '@/hooks/useFocusSessions'; // Import useFocusSessions
import { useUI } from '@/context/UIContext'; // Import useUI
import { useSound } from '@/context/SoundContext'; // Import useSound

interface FocusTaskOverlayProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onClearManualFocus: () => void;
  onMarkComplete: (taskId: string) => Promise<void>;
  initialTimerDurationMinutes?: number; // New prop for initial duration
  onSetIsFocusModeActive: (isActive: boolean) => void; // New prop from Index.tsx
}

const FocusTaskOverlay: React.FC<FocusTaskOverlayProps> = ({
  task,
  isOpen,
  onClose,
  onClearManualFocus,
  onMarkComplete,
  initialTimerDurationMinutes,
  onSetIsFocusModeActive,
}) => {
  const { logSession } = useFocusSessions();
  const { playSound } = useSound();
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedDuringSession, setCompletedDuringSession] = useState(false);

  const {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    progress,
  } = useTimer({
    initialDurationSeconds: (initialTimerDurationMinutes || 25) * 60, // Default to 25 min
    onTimerEnd: () => {
      playSound('alert');
      if (task && sessionStartTime) {
        logSession('custom', initialTimerDurationMinutes ? initialTimerDurationMinutes * 60 : 0, sessionStartTime, new Date(), task.id, completedDuringSession);
      }
      onSetIsFocusModeActive(false); // Deactivate focus mode when timer ends
    },
  });

  // Effect to set initial timer duration and start if provided
  useEffect(() => {
    if (isOpen && initialTimerDurationMinutes && task) {
      reset(); // Reset to ensure correct duration is set
      start();
      setSessionStartTime(new Date());
      playSound('start');
    }
  }, [isOpen, initialTimerDurationMinutes, task, reset, start, playSound]);

  // Sync focus mode state with UIContext
  useEffect(() => {
    onSetIsFocusModeActive(isOpen && isRunning);
    return () => {
      onSetIsFocusModeActive(false);
    };
  }, [isOpen, isRunning, onSetIsFocusModeActive]);

  if (!isOpen || !task) {
    return null;
  }

  // Renamed to be more specific, as it's now only for the X button
  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ensure this doesn't trigger parent clicks
    pause(); // Pause timer when closing
    if (task && sessionStartTime) {
      logSession('custom', (sessionStartTime.getTime() - new Date().getTime()) / 1000, sessionStartTime, new Date(), task.id, completedDuringSession);
    }
    onClearManualFocus();
    onClose();
  };

  const handleMarkCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedDuringSession(true); // Mark as completed during session
    await onMarkComplete(task.id);
    pause(); // Pause timer
    if (task && sessionStartTime) {
      logSession('custom', (sessionStartTime.getTime() - new Date().getTime()) / 1000, sessionStartTime, new Date(), task.id, true);
    }
    onClose();
  };

  const handleStartTimerClick = (e: React.MouseEvent, duration: number) => {
    e.stopPropagation();
    reset(); // Reset to ensure new duration is applied
    start();
    setSessionStartTime(new Date());
    playSound('start');
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      pause();
      playSound('pause');
    } else {
      start();
      setSessionStartTime(prev => prev || new Date()); // Set start time if not already set
      playSound('start');
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    reset();
    setSessionStartTime(null);
    setCompletedDuringSession(false);
    playSound('reset');
  };

  const timerDurations = [2, 5, 10, 15, 20, 25, 30];

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-primary text-primary-foreground" // Removed cursor-pointer and onClick
      )}
      // No onClick here anymore
    >
      <div className="max-w-4xl mx-auto text-center p-4" onClick={(e) => e.stopPropagation()}> {/* This still prevents clicks inside from bubbling out of this content area */}
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
          {task.description}
        </h1>
        {task.notes && (
          <p className="mt-6 text-xl md:text-2xl opacity-80 max-w-2xl mx-auto">
            {task.notes}
          </p>
        )}

        <div className="relative w-48 h-48 mx-auto flex items-center justify-center mt-12">
          <Progress
            value={progress}
            className="absolute w-full h-full rounded-full bg-muted"
            indicatorClassName={cn(
              "transition-all duration-1000 ease-linear",
              "bg-primary-foreground"
            )}
          />
          <div className="relative z-10 text-5xl font-bold text-primary-foreground">
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="flex justify-center space-x-4 mt-6">
          <Button
            size="lg"
            onClick={handlePlayPause}
            className={cn(
              "w-24",
              isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"
            )}
            disabled={timeRemaining === 0 && !isRunning}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button size="lg" variant="outline" onClick={handleReset} className="w-24">
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={handleMarkCompleteClick}
            className="bg-green-500 hover:bg-green-600 text-white text-lg px-6 py-3 rounded-lg shadow-lg"
          >
            <CheckCircle2 className="h-6 w-6 mr-2" /> Mark Complete
          </Button>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Set Timer Duration:</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {timerDurations.map(duration => (
              <Button
                key={duration}
                onClick={(e) => handleStartTimerClick(e, duration)}
                className="bg-secondary hover:bg-secondary-foreground text-secondary-foreground hover:text-primary-foreground text-md px-4 py-2 rounded-lg shadow-md"
              >
                <TimerIcon className="h-4 w-4 mr-2" /> {duration} min
              </Button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="absolute top-4 right-4 text-primary-foreground opacity-70 hover:opacity-100 transition-opacity duration-200"
        onClick={handleCloseButtonClick}
        aria-label="Clear manual focus and close"
      >
        <XCircle className="h-8 w-8" />
      </button>
    </div>
  );
};

export default FocusTaskOverlay;