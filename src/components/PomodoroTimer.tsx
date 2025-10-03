"use client";

import React from 'react';
import { usePomodoro } from '@/context/PomodoroContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, FastForward, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Ensure ProgressProps is available if needed
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom'; // For linking to settings

const PomodoroTimer: React.FC = () => {
  const {
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
  } = usePomodoro();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    let totalDuration = 0;
    let elapsedTime = 0;

    switch (timerState) {
      case 'working':
        totalDuration = workDuration * 60;
        elapsedTime = totalDuration - timeLeft;
        break;
      case 'shortBreak':
        totalDuration = shortBreakDuration * 60;
        elapsedTime = totalDuration - timeLeft;
        break;
      case 'longBreak':
        totalDuration = longBreakDuration * 60;
        elapsedTime = totalDuration - timeLeft;
        break;
      default:
        return 0;
    }
    return (elapsedTime / totalDuration) * 100;
  };

  const getTimerLabel = () => {
    switch (timerState) {
      case 'working':
        return 'Focus Time';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      case 'paused':
        return 'Paused';
      case 'idle':
      default:
        return 'Ready to Focus';
    }
  };

  const isBreak = timerState === 'shortBreak' || timerState === 'longBreak';
  const isTimerActive = timerState === 'working' || isBreak;

  return (
    <Card className="w-full max-w-md mx-auto text-center">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          {getTimerLabel()}
          <Link to="/settings" className="text-muted-foreground hover:text-primary">
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </CardTitle>
        {focusedTaskDescription && (
          <p className="text-sm text-muted-foreground mt-1">
            Focusing on: <span className="font-medium text-foreground">{focusedTaskDescription}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <Progress
            value={getProgressPercentage()}
            className={cn(
              "absolute inset-0 w-full h-full rounded-full",
              "bg-transparent",
              timerState === 'working' && "progress-primary",
              isBreak && "progress-green",
              timerState === 'paused' && "progress-gray"
            )}
            indicatorClassName={cn( // This prop is valid for shadcn/ui Progress
              "transition-colors duration-500",
              timerState === 'working' && "bg-primary",
              isBreak && "bg-green-500",
              timerState === 'paused' && "bg-gray-500"
            )}
          />
          <div className="relative z-10 flex flex-col items-center justify-center">
            <span className="text-6xl font-extrabold tabular-nums">
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              Round {currentRound}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {(timerState === 'idle' || timerState === 'paused') && (
            <Button onClick={() => startTimer()} disabled={isTimerActive}> {/* Corrected disabled logic */}
              <Play className="h-5 w-5 mr-2" /> Start
            </Button>
          )}
          {isTimerActive && ( /* Corrected condition */
            <Button onClick={pauseTimer}>
              <Pause className="h-5 w-5 mr-2" /> Pause
            </Button>
          )}
          <Button variant="outline" onClick={resetTimer} disabled={timerState === 'idle'}>
            <RotateCcw className="h-5 w-5 mr-2" /> Reset
          </Button>
          {isBreak && (
            <Button variant="secondary" onClick={skipBreak}>
              <FastForward className="h-5 w-5 mr-2" /> Skip Break
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer;