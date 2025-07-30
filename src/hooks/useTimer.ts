import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialDurationSeconds: number;
  onTimerEnd?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ initialDurationSeconds, onTimerEnd, onTick }: UseTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for callbacks to prevent stale closures in setInterval
  const onTimerEndRef = useRef(onTimerEnd);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTimerEndRef.current = onTimerEnd;
  }, [onTimerEnd]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Effect to initialize/reset timeRemaining when initialDurationSeconds changes
  useEffect(() => {
    setTimeRemaining(initialDurationSeconds);
    setIsRunning(false); // Stop timer if duration changes
    // Clear any existing interval to prevent multiple timers running
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [initialDurationSeconds]);

  // Main timer logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTickRef.current?.(newTime);

          if (newTime <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsRunning(false);
            onTimerEndRef.current?.();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      // If timer is paused or stopped, clear the interval
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup function to clear interval when component unmounts or dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeRemaining]); // timeRemaining is here to ensure cleanup if it hits 0 while running

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

  const reset = useCallback((newDuration?: number) => {
    const durationToSet = newDuration !== undefined ? newDuration : initialDurationSeconds;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeRemaining(durationToSet);
    setIsRunning(false);
  }, [initialDurationSeconds]);

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