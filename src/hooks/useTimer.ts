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

  // Store callbacks in refs to prevent stale closures in setInterval
  const onTimerEndRef = useRef(onTimerEnd);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTimerEndRef.current = onTimerEnd;
  }, [onTimerEnd]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Effect to handle starting and stopping the timer
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      // Start the interval
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTickRef.current?.(newTime); // Call onTick with the new time

          if (newTime <= 0) {
            // Timer finished, clear interval and trigger end callback
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsRunning(false); // Stop running
            onTimerEndRef.current?.(); // Call onTimerEnd
            return 0; // Set time to 0
          }
          return newTime; // Continue counting down
        });
      }, 1000);
    } else if (intervalRef.current) {
      // If not running or time is 0, clear any existing interval
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup function: clear interval when component unmounts or effect re-runs
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]); // Only re-run this effect when `isRunning` changes

  // Effect to reset time when initialDurationSeconds prop changes
  useEffect(() => {
    setTimeRemaining(initialDurationSeconds);
    setIsRunning(false); // Ensure timer stops if duration changes
  }, [initialDurationSeconds]);

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