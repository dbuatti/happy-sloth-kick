import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialDurationSeconds: number;
  onTimerEnd?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ initialDurationSeconds, onTimerEnd, onTick }: UseTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null); // Use a ref for the interval ID

  console.log(`[useTimer COMPONENT RENDER] initialDurationSeconds: ${initialDurationSeconds}, timeRemaining: ${timeRemaining}, isRunning: ${isRunning}`);

  // Effect to manage the timer interval
  useEffect(() => {
    console.log(`[useTimer EFFECT] isRunning: ${isRunning}, timeRemaining: ${timeRemaining}`);

    // If timer is running and there's time left
    if (isRunning && timeRemaining > 0) {
      timerIdRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTick?.(newTime); // Call onTick callback

          if (newTime <= 0) {
            console.log(`[useTimer EFFECT] Timer ended. Clearing interval.`);
            clearInterval(timerIdRef.current!); // Clear interval
            timerIdRef.current = null; // Clear ref
            setIsRunning(false); // Stop running
            onTimerEnd?.(); // Call onTimerEnd callback
            return 0; // Set time to 0
          }
          return newTime;
        });
      }, 1000);
    } else {
      // If not running or time is 0, ensure interval is cleared
      if (timerIdRef.current) {
        console.log(`[useTimer EFFECT] Not running or time is 0. Clearing interval.`);
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      // If time ran out, ensure isRunning is false
      if (timeRemaining <= 0 && isRunning) { // Only set to false if it was running and hit 0
        setIsRunning(false);
        onTimerEnd?.(); // Call onTimerEnd if it stopped naturally
      }
    }

    // Cleanup function: clear interval when component unmounts or dependencies change
    return () => {
      console.log(`[useTimer EFFECT] Cleanup. Clearing interval if exists.`);
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [isRunning, timeRemaining, onTimerEnd, onTick]); // Dependencies for the effect

  // Effect to reset timeRemaining when initialDurationSeconds changes
  useEffect(() => {
    console.log(`[useTimer EFFECT - initialDurationSeconds changed] Setting timeRemaining to ${initialDurationSeconds}`);
    setTimeRemaining(initialDurationSeconds);
    setIsRunning(false); // Always stop if duration changes
  }, [initialDurationSeconds]);


  const start = useCallback(() => {
    console.log(`[useTimer ACTION] start called. timeRemaining: ${timeRemaining}, isRunning: ${isRunning}`);
    if (timeRemaining > 0 && !isRunning) {
      setIsRunning(true);
      console.log(`[useTimer ACTION] Setting isRunning to true.`);
    } else {
      console.log(`[useTimer ACTION] Start ignored. Condition: timeRemaining > 0 (${timeRemaining > 0}) && !isRunning (${!isRunning}).`);
    }
  }, [timeRemaining, isRunning]);

  const pause = useCallback(() => {
    console.log(`[useTimer ACTION] pause called. isRunning: ${isRunning}`);
    if (isRunning) {
      setIsRunning(false);
      console.log(`[useTimer ACTION] Setting isRunning to false.`);
    } else {
      console.log(`[useTimer ACTION] Pause ignored. isRunning: ${isRunning}`);
    }
  }, [isRunning]);

  const reset = useCallback((newDuration?: number) => {
    console.log(`[useTimer ACTION] reset called. newDuration: ${newDuration}, current initialDurationSeconds: ${initialDurationSeconds}`);
    const durationToSet = newDuration !== undefined ? newDuration : initialDurationSeconds;
    setTimeRemaining(durationToSet);
    setIsRunning(false); // Ensure it's not running after reset
    console.log(`[useTimer ACTION] Reset complete. timeRemaining set to ${durationToSet}.`);
  }, [initialDurationSeconds]); // No need for `pause` here, as `setIsRunning(false)` handles it

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