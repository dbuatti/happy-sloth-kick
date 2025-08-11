import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCcw, Settings, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePomodoro } from '@/hooks/usePomodoro';
import PomodoroSettingsDialog from './PomodoroSettingsDialog';
import CircularProgress from './CircularProgress';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PomodoroTimer: React.FC = () => {
  const {
    mode,
    sessionsCompleted,
    timeRemaining,
    isRunning,
    settings,
    toggleTimer,
    resetTimer,
    skipSession,
    saveSettings,
    duration,
  } = usePomodoro();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const progress = duration > 0 ? (timeRemaining / duration) * 100 : 0;

  const getModeText = () => {
    switch (mode) {
      case 'work': return 'Focus';
      case 'short-break': return 'Short Break';
      case 'long-break': return 'Long Break';
    }
  };

  return (
    <>
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{getModeText()}</span>
          <span>•</span>
          <span>Session {sessionsCompleted + 1}</span>
        </div>
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
          <CircularProgress progress={progress} />
          <div className="relative z-10 text-4xl font-bold text-foreground">
            {formatTime(timeRemaining)}
          </div>
        </div>
        <div className="flex justify-center space-x-2">
          <Button
            size="sm"
            onClick={toggleTimer}
            className={cn(
              "w-24 h-9 text-base",
              isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
            )}
          >
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={skipSession} className="w-24 h-9 text-base">
            <SkipForward className="h-4 w-4" /> Skip
          </Button>
        </div>
        <div className="flex justify-center space-x-2">
          <Button size="sm" variant="ghost" onClick={resetTimer}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
        </div>
      </div>
      <PomodoroSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
      />
    </>
  );
};

export default PomodoroTimer;