import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialDurationSeconds: number;
  onTimerEnd?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ initialDurationSeconds, onTimerEnd, onTick }: UseTimerProps) => {
  // Use a ref to store the *current effective duration* that the timer is running for.
  // This helps distinguish between a prop change and an actual timer reset.
  const currentTimerDurationRef = useRef(initialDurationSeconds);

  const [timeRemaining, setTimeRemaining] = useState(initialDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerEndRef = useRef(onTimerEnd); // Use refs for callbacks to avoid re-creating interval
  const onTickRef = useRef(onTick); // Use refs for callbacks to avoid re-creating interval

  // Update refs when callbacks change
  useEffect(() => {
    onTimerEndRef.current = onTimerEnd;
  }, [onTimerEnd]);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  console.log(`[useTimer COMPONENT RENDER] initialDurationSeconds: ${initialDurationSeconds}, timeRemaining: ${timeRemaining}, isRunning: ${isRunning}, currentTimerDurationRef: ${currentTimerDurationRef.current}`);

  // This effect updates the internal timeRemaining when the *initialDurationSeconds prop changes its value*
  // It also ensures the timer stops if the base duration is changed while running.
  useEffect(() => {
    // Only update if the incoming prop value is different from the currently set duration
    if (initialDurationSeconds !== currentTimerDurationRef.current) {
      console.log(`[useTimer EFFECT - initialDurationSeconds prop changed] From ${currentTimerDurationRef.current} to ${initialDurationSeconds}. Resetting timer.`);
      currentTimerDurationRef.current = initialDurationSeconds; // Update the ref
      setTimeRemaining(initialDurationSeconds);
      setIsRunning(false); // Stop the timer if its base duration changes
    }
  }, [initialDurationSeconds]); // Depend only on the prop

  // Main timer logic
  useEffect(() => {
    console.log(`[useTimer EFFECT - Main Timer] isRunning: ${isRunning}, timeRemaining: ${timeRemaining}`);

    if (isRunning && timeRemaining > 0) {
      timerIdRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTickRef.current?.(newTime);

          if (newTime <= 0) {
            console.log(`[useTimer EFFECT - Main Timer] Timer End: newTime=${newTime}. Clearing interval.`);
            clearInterval(timerIdRef.current!);
            timerIdRef.current = null;
            setIsRunning(false);
            onTimerEndRef.current?.();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerIdRef.current) {
        console.log(`[useTimer EFFECT - Main Timer] Not running or time is 0. Clearing interval.`);
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      if (timeRemaining <= 0 && isRunning) {
        setIsRunning(false);
        onTimerEndRef.current?.();
      }
    }

    return () => {
      console.log(`[useTimer EFFECT - Main Timer] Cleanup: Clearing interval.`);
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [isRunning]); // Removed timeRemaining from dependencies

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
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    const durationToSet = newDuration !== undefined ? newDuration : initialDurationSeconds;
    currentTimerDurationRef.current = durationToSet; // Update ref on reset
    setTimeRemaining(durationToSet);
    setIsRunning(false);
    console.log(`[useTimer ACTION] Reset complete. timeRemaining set to ${durationToSet}.`);
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
    progress: (timeRemaining / currentTimerDurationRef.current) * 100, // Use ref for progress calculation
  };
};