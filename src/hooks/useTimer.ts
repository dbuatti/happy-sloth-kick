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

  // Effect to synchronize timeRemaining with initialDurationSeconds when not running
  // or when initialDurationSeconds changes and timer is reset.
  useEffect(() => {
    console.log(`[useTimer] useEffect [initialDurationSeconds, isRunning]: initialDurationSeconds=${initialDurationSeconds}, isRunning=${isRunning}`);
    if (!isRunning) {
      setTimeRemaining(initialDurationSeconds);
      console.log(`[useTimer] useEffect [initialDurationSeconds, isRunning]: Set timeRemaining to ${initialDurationSeconds}.`);
    }
  }, [initialDurationSeconds, isRunning]); // Keep isRunning here to re-evaluate when timer stops

  // Main timer logic
  useEffect(() => {
    console.log(`[useTimer] useEffect [isRunning, timeRemaining]: isRunning=${isRunning}, timeRemaining=${timeRemaining}`);
    if (isRunning && timeRemaining > 0) { // Only start if running and time is left
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          onTick?.(newTime);
          console.log(`[useTimer] Tick: prevTime=${prevTime}, newTime=${newTime}`);
          if (newTime <= 0) {
            console.log(`[useTimer] Timer End: newTime=${newTime}. Clearing interval.`);
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
        console.log(`[useTimer] Paused/Stopped/Ended: Clearing interval.`);
        clearInterval(timerRef.current);
      }
      // If timer ended (timeRemaining <= 0), ensure isRunning is false
      if (timeRemaining <= 0) {
        setIsRunning(false);
      }
    }

    return () => {
      if (timerRef.current) {
        console.log(`[useTimer] Cleanup: Clearing interval.`);
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeRemaining, onTimerEnd, onTick]); // Add timeRemaining to dependencies for immediate stop at 0

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
    pause(); // First, pause the timer
    const durationToSet = newDuration !== undefined ? newDuration : initialDurationSeconds;
    setTimeRemaining(durationToSet);
    setIsRunning(false); // Ensure it's not running after reset
    console.log(`[useTimer] Action: Reset complete. timeRemaining set to ${durationToSet}.`);
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