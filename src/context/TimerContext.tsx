import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from './SoundContext';

interface TimerContextType {
  duration: number;
  timeRemaining: number;
  isRunning: boolean;
  isTimerActive: boolean;
  startTimer: (minutes: number) => void;
  togglePause: () => void;
  resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playSound } = useSound();
  const [duration, setDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null); // Ref to store the target end time

  // This function calculates the remaining time based on the system clock
  const tick = useCallback(() => {
    if (endTimeRef.current) {
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        playSound('alert');
      } else {
        setTimeRemaining(remaining);
      }
    }
  }, [playSound]);

  useEffect(() => {
    if (isRunning) {
      // Start the interval, which will now call the more accurate 'tick' function
      timerRef.current = setInterval(tick, 1000);
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
  }, [isRunning, tick]);

  const startTimer = useCallback((minutes: number) => {
    const seconds = minutes * 60;
    setDuration(seconds);
    setTimeRemaining(seconds);
    // Set the target end time based on the current system time
    endTimeRef.current = Date.now() + seconds * 1000;
    setIsRunning(true);
    setIsTimerActive(true);
    playSound('start');
  }, [playSound]);

  const togglePause = useCallback(() => {
    setIsRunning(prev => {
      if (prev) { // Pausing
        if (timerRef.current) clearInterval(timerRef.current);
        playSound('pause');
      } else { // Resuming
        // Calculate a new end time based on the time that was remaining
        endTimeRef.current = Date.now() + timeRemaining * 1000;
        playSound('start');
      }
      return !prev;
    });
  }, [playSound, timeRemaining]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsTimerActive(false);
    setDuration(0);
    setTimeRemaining(0);
    endTimeRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('reset');
  }, [playSound]);

  return (
    <TimerContext.Provider value={{ duration, timeRemaining, isRunning, isTimerActive, startTimer, togglePause, resetTimer }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};