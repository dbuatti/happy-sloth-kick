import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerProps {
  initialDurationSeconds: number;
  onTimerEnd?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ initialDurationSeconds, onTimerEnd, onTick }: UseTimerProps) => {
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

  console.log(`[useTimer COMPONENT RENDER] initialDurationSeconds: ${initialDurationSeconds}, timeRemaining: ${timeRemaining}, isRunning: ${isRunning}`);

  // This effect ensures timeRemaining is reset when initialDurationSeconds changes
  useEffect(() => {
    console.log(`[useTimer EFFECT - initialDurationSeconds changed] Setting timeRemaining to ${initialDurationSeconds}`);
    setTimeRemaining(initialDurationSeconds);
    setIsRunning(false); // Always stop if duration changes
  }, [initialDurationSeconds]);

  // Main timer logic
  useEffect(() => {
    console.log(`[useTimer EFFECT] isRunning: ${isRunning}, timeRemaining: ${timeRemaining}`);

    if (isRunning && timeRemaining > 0) {
      timerIdRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTickRef.current?.(newTime); // Use ref for onTick

          if (newTime <= 0) {
            console.log(`[useTimer EFFECT] Timer End: newTime=${newTime}. Clearing interval.`);
            clearInterval(timerIdRef.current!);
            timerIdRef.current = null;
            setIsRunning(false);
            onTimerEndRef.current?.(); // Use ref for onTimerEnd
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerIdRef.current) {
        console.log(`[useTimer EFFECT] Not running or time is 0. Clearing interval.`);
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      if (timeRemaining <= 0 && isRunning) {
        setIsRunning(false);
        onTimerEndRef.current?.(); // Call onTimerEnd if it stopped naturally
      }
    }

    return () => {
      if (timerIdRef.current) {
        console.log(`[useTimer EFFECT] Cleanup: Clearing interval.`);
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [isRunning]); // ONLY depend on isRunning. timeRemaining is handled by functional update.

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
    progress: (timeRemaining / initialDurationSeconds) * 100,
  };
};