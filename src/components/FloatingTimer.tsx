import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, X } from "lucide-react";
import { useTimer } from '@/context/TimerContext';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
      <circle
        className="text-muted/20"
        strokeWidth="5"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
      />
      <circle
        className="text-primary"
        strokeWidth="5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    </svg>
  );
};

const FloatingTimer: React.FC = () => {
  const {
    duration,
    timeRemaining,
    isRunning,
    isTimerActive,
    startTimer,
    togglePause,
    resetTimer,
  } = useTimer();

  const timerOptions = [5, 10, 15, 20, 25];

  if (!isTimerActive) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50" size="icon">
            <Timer className="h-7 w-7" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 mb-2" side="top" align="end">
          <div className="flex flex-col gap-2">
            {timerOptions.map(minutes => (
              <Button key={minutes} variant="ghost" onClick={() => startTimer(minutes)}>
                {minutes} minutes
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const progress = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 flex flex-col items-center justify-center p-0"
          size="icon"
        >
          <div className="relative h-full w-full flex items-center justify-center">
            <CircularProgress progress={progress} />
            <span className="relative text-lg font-mono">{formatTime(timeRemaining)}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 mb-2" side="top" align="end">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={togglePause}>
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={resetTimer} className="text-destructive">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FloatingTimer;