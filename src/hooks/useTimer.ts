import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialDurationSeconds: number;
  onTimerEnd?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ initialDurationSeconds, onTimerEnd, onTick }: UseTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  console.log(`[useTimer] Init/Render: initialDurationSeconds=${initialDurationSeconds}, timeRemaining=${timeRemaining}, isRunning=${isRunning}`);

  // This effect ensures timeRemaining is reset when initialDurationSeconds changes
  // or when the timer is explicitly reset.
  // It should NOT depend on `isRunning` directly for resetting, as `isRunning`
  // changing to false might be the *result* of time running out, and we want
  // timeRemaining to be reset to initialDurationSeconds *then*.
  useEffect(() => {
    console.log(`[useTimer] Effect: initialDurationSeconds changed to ${initialDurationSeconds}. Resetting timeRemaining.`);
    setTimeRemaining(initialDurationSeconds);
    // Also ensure it's not running if duration changes while it was running
    if (isRunning) {
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [initialDurationSeconds]); // Only depend on initialDurationSeconds

  // Main timer logic
  useEffect(() => {
    console.log(`[useTimer] Effect: isRunning=${isRunning}, timeRemaining=${timeRemaining}`);
    if (isRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTick?.(newTime);
          console.log(`[useTimer] Tick: prevTime=${prevTime}, newTime=${newTime}`);
          if (newTime <= 0) {
            console.log(`[useTimer] Timer End: newTime=${newTime}. Clearing interval.`);
            clearInterval(timerRef.current!);
            timerRef.current = null; // Clear ref
            setIsRunning(false); // Stop running
            onTimerEnd?.(); // Call end callback
            return 0; // Set time to 0
          }
          return newTime;
        });
      }, 1000);
    } else {
      // If not running or time is 0, clear any existing interval
      if (timerRef.current) {
        console.log(`[useTimer] Paused/Stopped/Ended: Clearing interval.`);
        clearInterval(timerRef.current);
        timerRef.current = null; // Clear ref
      }
      // Ensure isRunning is false if time runs out
      if (timeRemaining <= 0) {
        setIsRunning(false);
      }
    }

    return () => {
      if (timerRef.current) {
        console.log(`[useTimer] Cleanup: Clearing interval.`);
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, timeRemaining, onTimerEnd, onTick]); // Keep timeRemaining here to stop interval when it hits 0

  const start = useCallback(() => {
    console.log(`[useTimer] Action: start called. timeRemaining=${timeRemaining}, isRunning=${isRunning}`);
    if (timeRemaining > 0 && !isRunning) {
      setIsRunning(true);
      console.log(`[useTimer] Action: Setting isRunning to true. Current timeRemaining: ${timeRemaining}`);
    } else {
      console.log(`[useTimer] Action: Start ignored. Condition: timeRemaining > 0 (${timeRemaining > 0}) && !isRunning (${!isRunning}).`);
    }
  }, [timeRemaining, isRunning]);

  const pause = useCallback(() => {
    console.log(`[useTimer] Action: pause called. isRunning=${isRunning}`);
    if (isRunning) {
      setIsRunning(false);
      console.log(`[useTimer] Action: Setting isRunning to false.`);
    } else {
      console.log(`[useTimer] Action: Pause ignored. isRunning=${isRunning}`);
    }
  }, [isRunning]);

  const reset = useCallback((newDuration?: number) => {
    console.log(`[useTimer] Action: reset called. newDuration=${newDuration}, current initialDurationSeconds=${initialDurationSeconds}`);
    // Clear any running interval immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const durationToSet = newDuration !== undefined ? newDuration : initialDurationSeconds;
    setTimeRemaining(durationToSet);
    setIsRunning(false); // Ensure it's not running after reset
    console.log(`[useTimer] Action: Reset complete. timeRemaining set to ${durationToSet}.`);
  }, [initialDurationSeconds]); // Removed `pause` from dependencies to avoid circularity and ensure direct control

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