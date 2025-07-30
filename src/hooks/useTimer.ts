import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialDurationSeconds: number; // This is now the *current* desired duration
  onTimerEnd?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ initialDurationSeconds, onTimerEnd, onTick }: UseTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update timeRemaining when initialDurationSeconds changes.
  // This ensures that when a new duration button is clicked, the timer resets to that new duration.
  useEffect(() => {
    // Only update if the timer is not running, or if the new duration is different from current remaining time
    // This prevents resetting mid-countdown unless a new duration is explicitly selected.
    if (!isRunning || initialDurationSeconds !== timeRemaining) {
      setTimeRemaining(initialDurationSeconds);
    }
  }, [initialDurationSeconds, isRunning]); // Depend on initialDurationSeconds and isRunning

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTick?.(newTime);
          if (newTime <= 0) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            onTimerEnd?.();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, onTimerEnd, onTick]);

  const start = useCallback(() => {
    if (timeRemaining > 0 && !isRunning) {
      setIsRunning(true);
    }
  }, [timeRemaining, isRunning]);

  const pause = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    pause();
    setTimeRemaining(initialDurationSeconds); // Reset to the current initialDurationSeconds prop
  }, [pause, initialDurationSeconds]); // Depend on initialDurationSeconds

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    progress: (timeRemaining / initialDurationSeconds) * 100, // Use initialDurationSeconds for progress calculation
  };
};