"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '@/context/SoundContext';
import { useSettings } from '@/context/SettingsContext';
import { showSuccess } from '@/utils/toast'; // Removed showError as it's unused

interface PomodoroContextType {
  timerState: 'idle' | 'working' | 'shortBreak' | 'longBreak' | 'paused';
  timeLeft: number; // in seconds
  currentRound: number;
  startTimer: (taskDescription?: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipBreak: () => void;
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  focusedTaskDescription: string | null;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

interface PomodoroProviderProps {
  children: React.ReactNode;
}

export const PomodoroProvider: React.FC<PomodoroProviderProps> = ({ children }) => {
  const { playSound } = useSound();
  const { settings } = useSettings();

  // Access settings with optional chaining and provide defaults
  const workDuration = settings?.pomodoro_work_duration || 25; // minutes
  const shortBreakDuration = settings?.pomodoro_short_break_duration || 5; // minutes
  const longBreakDuration = settings?.pomodoro_long_break_duration || 15; // minutes
  const roundsBeforeLongBreak = settings?.pomodoro_rounds_before_long_break || 4;

  const [timerState, setTimerState] = useState<'idle' | 'working' | 'shortBreak' | 'longBreak' | 'paused'>('idle');
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [currentRound, setCurrentRound] = useState(0);
  const [focusedTaskDescription, setFocusedTaskDescription] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  // Removed unused getDurationForState

  const startTimer = useCallback((taskDescription?: string) => {
    if (timerState === 'idle' || timerState === 'paused') {
      if (timerState === 'idle') {
        setTimeLeft(workDuration * 60);
        setFocusedTaskDescription(taskDescription || null);
      }
      setTimerState('working');
      playSound('start');
    }
  }, [timerState, workDuration, playSound]);

  const pauseTimer = useCallback(() => {
    if (timerState === 'working' || timerState === 'shortBreak' || timerState === 'longBreak') {
      setTimerState('paused');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      playSound('pause');
    }
  }, [timerState, playSound]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState('idle');
    setTimeLeft(workDuration * 60);
    setCurrentRound(0);
    setFocusedTaskDescription(null);
    playSound('reset');
  }, [workDuration, playSound]);

  const skipBreak = useCallback(() => {
    if (timerState === 'shortBreak' || timerState === 'longBreak') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimerState('working');
      setTimeLeft(workDuration * 60);
      playSound('start');
    }
  }, [timerState, workDuration, playSound]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerState === 'working' || timerState === 'shortBreak' || timerState === 'longBreak') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            playSound('end');
            if (timerState === 'working') {
              const nextRound = currentRound + 1;
              setCurrentRound(nextRound);
              if (nextRound % roundsBeforeLongBreak === 0) {
                setTimerState('longBreak');
                setTimeLeft(longBreakDuration * 60);
                showSuccess('Time for a long break!');
              } else {
                setTimerState('shortBreak');
                setTimeLeft(shortBreakDuration * 60);
                showSuccess('Time for a short break!');
              }
            } else { // It was a break
              setTimerState('working');
              setTimeLeft(workDuration * 60);
              showSuccess('Back to work!');
            }
            return 0; // Resetting time for the next phase
          }
          return prevTime - 1;
        });
      }, 1000) as unknown as number; // Type assertion for setInterval return type
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, currentRound, workDuration, shortBreakDuration, longBreakDuration, roundsBeforeLongBreak, playSound]);

  // Update timeLeft if durations change while idle
  useEffect(() => {
    if (timerState === 'idle') {
      setTimeLeft(workDuration * 60);
    }
  }, [workDuration, timerState]);

  const value = {
    timerState,
    timeLeft,
    currentRound,
    startTimer,
    pauseTimer,
    resetTimer,
    skipBreak,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    focusedTaskDescription,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};