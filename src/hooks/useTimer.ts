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

  // Effect to update timeRemaining when initialDurationSeconds changes, but only if not running
  useEffect(() => {
    console.log(`[useTimer] useEffect [initialDurationSeconds]: initialDurationSeconds changed to ${initialDurationSeconds}. isRunning=${isRunning}`);
    if (!isRunning) {
      setTimeRemaining(initialDurationSeconds);
      console.log(`[useTimer] useEffect [initialDurationSeconds]: Set timeRemaining to ${initialDurationSeconds}.`);
    } else {
      console.log(`[useTimer] useEffect [initialDurationSeconds]: Timer is running, not resetting timeRemaining.`);
    }
  }, [initialDurationSeconds, isRunning]);

  // Main timer logic
  useEffect(() => {
    console.log(`[useTimer] useEffect [isRunning]: isRunning changed to ${isRunning}. timeRemaining=${timeRemaining}`);
    if (isRunning) {
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
        console.log(`[useTimer] Paused/Stopped: Clearing interval.`);
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        console.log(`[useTimer] Cleanup: Clearing interval.`);
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, onTimerEnd, onTick]);

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

  // Modified reset to accept an optional newDuration
  const reset = useCallback((newDuration?: number) => {
    console.log(`[useTimer] Action: reset called. newDuration=${newDuration}, current initialDurationSeconds=${initialDurationSeconds}`);
    pause(); // First, pause the timer
    const durationToSet = newDuration !== undefined ? newDuration : initialDurationSeconds;
    setTimeRemaining(durationToSet);
    setIsRunning(false); // Ensure it's not running after reset
    console.log(`[useTimer] Action: Reset complete. timeRemaining set to ${durationToSet}.`);
  }, [pause, initialDurationSeconds]); // initialDurationSeconds is a dependency because it's the default if newDuration is not provided

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