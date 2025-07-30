import React, { useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/Progress';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TimerTest: React.FC = () => {
  const [durationInput, setDurationInput] = useState('10'); // Default to 10 seconds for easy testing
  const [currentDuration, setCurrentDuration] = useState(10);

  const {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    formatTime,
    progress,
  } = useTimer({
    initialDurationSeconds: currentDuration,
    onTimerEnd: () => {
      console.log('Timer finished!');
      alert('Timer finished!');
    },
    onTick: (time) => {
      // console.log('Tick:', time);
    }
  });

  const handleSetDuration = () => {
    const newDuration = parseInt(durationInput, 10);
    if (!isNaN(newDuration) && newDuration > 0) {
      setCurrentDuration(newDuration);
      // Reset the timer to the new duration
      // The useEffect in useTimer will pick up the new initialDurationSeconds
      // and reset timeRemaining automatically.
      if (!isRunning) { // Only reset if not running, otherwise it will restart
        reset();
      }
    } else {
      alert('Please enter a valid positive number for duration.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg text-center mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Timer Test Component</CardTitle>
        <p className="text-muted-foreground">Testing the `useTimer` hook.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <Progress
            value={progress}
            className="absolute w-full h-full rounded-full bg-muted"
            indicatorClassName="transition-all duration-1000 ease-linear bg-blue-500"
          />
          <div className="relative z-10 text-5xl font-bold text-foreground">
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button size="lg" onClick={isRunning ? pause : start} className="w-24">
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button size="lg" variant="outline" onClick={reset} className="w-24">
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration-input">Set Duration (seconds)</Label>
          <div className="flex gap-2">
            <Input
              id="duration-input"
              type="number"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="e.g., 60"
              min="1"
            />
            <Button onClick={handleSetDuration}>Set</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimerTest;