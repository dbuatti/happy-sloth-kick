import { useState, useEffect, useCallback, useRef } from 'react';
import { useSound } from '@/context/SoundContext';

interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsUntilLongBreak: number;
}

const getInitialSettings = (): PomodoroSettings => {
  if (typeof window !== 'undefined') {
    try {
      const savedSettings = localStorage.getItem('pomodoroSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('Error parsing pomodoro settings from localStorage', error);
    }
  }
  return {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
  };
};

export const usePomodoro = () => {
  const { playSound } = useSound();
  const [settings, setSettings] = useState<PomodoroSettings>(getInitialSettings);
  const [mode, setMode] = useState<'work' | 'short-break' | 'long-break'>('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const saveSettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
    resetTimer(); // Reset timer when settings change
  };

  const startNextSession = useCallback(() => {
    setIsRunning(false);
    if (mode === 'work') {
      const newSessionsCompleted = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCompleted);
      if (newSessionsCompleted % settings.sessionsUntilLongBreak === 0) {
        setMode('long-break');
        setTimeRemaining(settings.longBreakDuration * 60);
      } else {
        setMode('short-break');
        setTimeRemaining(settings.shortBreakDuration * 60);
      }
    } else {
      setMode('work');
      setTimeRemaining(settings.workDuration * 60);
    }
    playSound('alert');
  }, [mode, sessionsCompleted, settings, playSound]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            startNextSession();
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
  }, [isRunning, startNextSession]);

  const toggleTimer = () => {
    setIsRunning(prev => !prev);
    playSound(isRunning ? 'pause' : 'start');
  };

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setSessionsCompleted(0);
    setTimeRemaining(settings.workDuration * 60);
    playSound('reset');
  }, [settings, playSound]);

  const skipSession = () => {
    startNextSession();
  };

  return {
    mode,
    sessionsCompleted,
    timeRemaining,
    isRunning,
    settings,
    toggleTimer,
    resetTimer,
    skipSession,
    saveSettings,
    duration: (mode === 'work' ? settings.workDuration : mode === 'short-break' ? settings.shortBreakDuration : settings.longBreakDuration) * 60,
  };
};