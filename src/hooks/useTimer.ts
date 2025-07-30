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

  // Effect to initialize timeRemaining when initialDurationSeconds changes, but only if not running
  useEffect(() => {
    if (!isRunning && timeRemaining !== initialDurationSeconds) {
      setTimeRemaining(initialDurationSeconds);
    }
  }, [initialDurationSeconds, isRunning]); // Removed timeRemaining from dependencies here to prevent loop

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
  }, [pause, initialDurationSeconds]);

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
    progress: (timeRemaining / initialDurationSeconds) * 100,
  };
};