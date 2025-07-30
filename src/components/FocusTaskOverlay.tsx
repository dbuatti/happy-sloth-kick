import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { XCircle, CheckCircle2, Timer as TimerIcon, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/Progress';
import { useTimer } from '@/hooks/useTimer';
import { useFocusSessions } from '@/hooks/useFocusSessions';
import { useUI } from '@/context/UIContext';
import { useSound } from '@/context/SoundContext';

interface FocusTaskOverlayProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onClearManualFocus: () => void;
  onMarkComplete: (taskId: string) => Promise<void>;
  initialTimerDurationMinutes?: number;
  onSetIsFocusModeActive: (isActive: boolean) => void;
}

const FocusTaskOverlay: React.FC<FocusTaskOverlayProps> = ({
  task,
  isOpen,
  onClose,
  onClearManualFocus,
  onMarkComplete,
  initialTimerDurationMinutes: propInitialTimerDurationMinutes,
  onSetIsFocusModeActive,
}) => {
  const { logSession } = useFocusSessions();
  const { playSound } = useSound();
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [completedDuringSession, setCompletedDuringSession] = useState(false);
  const [currentTimerDuration, setCurrentTimerDuration] = useState(propInitialTimerDurationMinutes || 25);

  const {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    progress,
  } = useTimer({
    initialDurationSeconds: currentTimerDuration * 60,
    onTimerEnd: () => {
      playSound('alert');
      if (task && sessionStartTime) {
        logSession('custom', currentTimerDuration * 60, sessionStartTime, new Date(), task.id, completedDuringSession);
      }
      onSetIsFocusModeActive(false);
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen && task) {
      const durationToSet = propInitialTimerDurationMinutes !== undefined ? propInitialTimerDurationMinutes : 25;
      setCurrentTimerDuration(durationToSet);
      // The useTimer hook's useEffect will handle setting timeRemaining based on currentTimerDuration
      start();
      setSessionStartTime(new Date());
      playSound('start');
    } else if (!isOpen) {
      pause();
      setSessionStartTime(null);
      setCompletedDuringSession(false);
      onClearManualFocus();
    }
  }, [isOpen, propInitialTimerDurationMinutes, task, start, pause, playSound, onClearManualFocus]);

  useEffect(() => {
    onSetIsFocusModeActive(isOpen && isRunning);
    return () => {
      onSetIsFocusModeActive(false);
    };
  }, [isOpen, isRunning, onSetIsFocusModeActive]);

  if (!isOpen || !task) {
    return null;
  }

  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    pause();
    if (task && sessionStartTime) {
      logSession('custom', (new Date().getTime() - sessionStartTime.getTime()) / 1000, sessionStartTime, new Date(), task.id, completedDuringSession);
    }
    onClose();
  };

  const handleMarkCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCompletedDuringSession(true);
    await onMarkComplete(task.id);
    pause();
    if (task && sessionStartTime) {
      logSession('custom', (new Date().getTime() - sessionStartTime.getTime()) / 1000, sessionStartTime, new Date(), task.id, true);
    }
    onClose();
  };

  const handleStartTimerClick = (e: React.MouseEvent, duration: number) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentTimerDuration(duration); // This updates initialTimerDurationMinutes in useTimer
    reset(); // Reset to the new duration set by setCurrentTimerDuration
    start(); // This will start the timer
    setSessionStartTime(new Date());
    playSound('start');
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isRunning) {
      pause();
      playSound('pause');
    } else {
      start();
      setSessionStartTime(prev => prev || new Date());
      playSound('start');
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
        "bg-background text-foreground"
      )}
      onClick={handleCloseButtonClick} // Allow clicking anywhere on the background to close
    >
      <div
        className="max-w-4xl mx-auto text-center p-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()} // Prevent clicks on content from closing overlay
      >
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
              "bg-primary"
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
        className="absolute top-4 right-4 text-primary-foreground opacity-70 hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
        onClick={handleCloseButtonClick}
        aria-label="Clear manual focus and close"
      >
        <XCircle className="h-8 w-8" />
      </button>
    </div>
  );
};

export default FocusTaskOverlay;