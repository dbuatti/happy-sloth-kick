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

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playSound('alert');
            // Don't reset immediately, let user see 00:00
            return 0;
          }
          return prev - 1;
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
  }, [isRunning, playSound]);

  const startTimer = useCallback((minutes: number) => {
    const seconds = minutes * 60;
    setDuration(seconds);
    setTimeRemaining(seconds);
    setIsRunning(true);
    setIsTimerActive(true);
    playSound('start');
  }, [playSound]);

  const togglePause = useCallback(() => {
    setIsRunning(prev => {
      if (prev) playSound('pause'); else playSound('start');
      return !prev;
    });
  }, [playSound]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsTimerActive(false);
    setDuration(0);
    setTimeRemaining(0);
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