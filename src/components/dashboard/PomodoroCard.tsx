import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, FastForward, Settings as SettingsIcon, TimerIcon } from 'lucide-react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { showError } from '@/utils/toast';

interface PomodoroCardProps {
  isDemo?: boolean;
  demoUserId?: string; // Not directly used by usePomodoro, but passed for consistency
}

const PomodoroCard: React.FC<PomodoroCardProps> = ({ isDemo = false }) => {
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
  } = usePomodoro();

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [workDuration, setWorkDuration] = React.useState(settings.workDuration);
  const [shortBreakDuration, setShortBreakDuration] = React.useState(settings.shortBreakDuration);
  const [longBreakDuration, setLongBreakDuration] = React.useState(settings.longBreakDuration);
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = React.useState(settings.sessionsUntilLongBreak);

  React.useEffect(() => {
    setWorkDuration(settings.workDuration);
    setShortBreakDuration(settings.shortBreakDuration);
    setLongBreakDuration(settings.longBreakDuration);
    setSessionsUntilLongBreak(settings.sessionsUntilLongBreak);
  }, [settings]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSaveSettings = () => {
    if (isDemo) {
      showError("Pomodoro settings cannot be changed in demo mode.");
      return;
    }
    saveSettings({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsUntilLongBreak,
    });
    setIsSettingsOpen(false);
  };

  const handleToggleTimer = () => {
    if (isDemo) {
      showError("Pomodoro timer is disabled in demo mode.");
      return;
    }
    toggleTimer();
  };

  const handleResetTimer = () => {
    if (isDemo) {
      showError("Pomodoro timer is disabled in demo mode.");
      return;
    }
    resetTimer();
  };

  const handleSkipSession = () => {
    if (isDemo) {
      showError("Pomodoro timer is disabled in demo mode.");
      return;
    }
    skipSession();
  };

  const modeColors = {
    'work': 'text-primary',
    'short-break': 'text-green-500',
    'long-break': 'text-blue-500',
  };

  const modeBackgrounds = {
    'work': 'bg-primary/10',
    'short-break': 'bg-green-500/10',
    'long-break': 'bg-blue-500/10',
  };

  return (
    <Card className="w-full h-full flex flex-col justify-between rounded-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <TimerIcon className="h-5 w-5 text-primary" /> Pomodoro Timer
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} disabled={isDemo}>
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center p-4">
        <div className={`text-sm font-medium mb-2 px-3 py-1 rounded-full ${modeColors[mode]} ${modeBackgrounds[mode]}`}>
          {mode.replace('-', ' ').toUpperCase()}
        </div>
        <div className="text-6xl font-extrabold tabular-nums mb-4">
          {formatTime(timeRemaining)}
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          Sessions Completed: {sessionsCompleted}
        </div>
        <div className="flex gap-2">
          <Button size="icon" onClick={handleToggleTimer} disabled={isDemo}>
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button size="icon" variant="outline" onClick={handleResetTimer} disabled={isDemo}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="outline" onClick={handleSkipSession} disabled={isDemo}>
            <FastForward className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pomodoro Settings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="work-duration" className="text-right">
                Work (min)
              </Label>
              <Input
                id="work-duration"
                type="number"
                value={workDuration}
                onChange={(e) => setWorkDuration(Number(e.target.value))}
                className="col-span-3"
                min="1"
                disabled={isDemo}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="short-break-duration" className="text-right">
                Short Break (min)
              </Label>
              <Input
                id="short-break-duration"
                type="number"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                className="col-span-3"
                min="1"
                disabled={isDemo}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="long-break-duration" className="text-right">
                Long Break (min)
              </Label>
              <Input
                id="long-break-duration"
                type="number"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                className="col-span-3"
                min="1"
                disabled={isDemo}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sessions-until-long-break" className="text-right">
                Sessions until Long Break
              </Label>
              <Input
                id="sessions-until-long-break"
                type="number"
                value={sessionsUntilLongBreak}
                onChange={(e) => setSessionsUntilLongBreak(Number(e.target.value))}
                className="col-span-3"
                min="1"
                disabled={isDemo}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSaveSettings} disabled={isDemo}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PomodoroCard;