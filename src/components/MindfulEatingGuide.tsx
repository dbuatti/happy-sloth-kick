import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MindfulEatingGuide: React.FC = () => {
  const { playSound } = useSound();
  const [duration, setDuration] = useState(5 * 60); // Default to 5 minutes in seconds
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false); // To track if a session has started
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsSessionActive(false);
            playSound('complete'); // Play completion sound
            return 0;
          }
          return prevTime - 1;
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

  const startTimer = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
      setIsSessionActive(true);
      playSound('start');
    }
  }, [timeRemaining, playSound]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    playSound('pause');
  }, [playSound]);

  const resetTimer = useCallback(() => {
    pauseTimer();
    setTimeRemaining(duration);
    setIsSessionActive(false);
    playSound('reset');
  }, [pauseTimer, duration, playSound]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDurationChange = (value: string) => {
    const newDuration = parseInt(value) * 60;
    setDuration(newDuration);
    if (!isRunning) {
      setTimeRemaining(newDuration);
    }
  };

  const progressValue = (timeRemaining / duration) * 100;

  return (
    <Card className="w-full max-w-md shadow-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" /> Mindful Eating
        </CardTitle>
        <p className="text-muted-foreground">
          Bring full awareness to your food and the act of eating.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 text-left">
          <h3 className="text-lg font-semibold">How to Practice:</h3>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li><strong>Observe:</strong> Look at your food. Notice its colors, shapes, and textures.</li>
            <li><strong>Smell:</strong> Bring the food to your nose. Inhale its aromas deeply.</li>
            <li><strong>Taste:</strong> Take a small bite. Let it sit on your tongue. Notice the initial flavors.</li>
            <li><strong>Chew:</strong> Chew slowly and deliberately. Pay attention to the changing textures and flavors.</li>
            <li><strong>Swallow:</strong> Notice the sensation as you swallow.</li>
            <li><strong>Reflect:</strong> Pause between bites. Notice how your body feels.</li>
          </ul>
        </div>

        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <Progress
            value={progressValue}
            className="absolute w-full h-full rounded-full bg-muted"
            indicatorClassName={cn(
              "transition-all duration-1000 ease-linear",
              "bg-orange-500"
            )}
          />
          <div className="relative z-10 text-5xl font-bold text-foreground">
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button
            size="lg"
            onClick={isRunning ? pauseTimer : startTimer}
            className={cn(
              "w-24",
              isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-orange-600 hover:bg-orange-700"
            )}
            disabled={timeRemaining === 0 && isSessionActive}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button size="lg" variant="outline" onClick={resetTimer} className="w-24">
            <RefreshCcw className="h-6 w-6" />
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Set Practice Duration:</p>
          <Select value={(duration / 60).toString()} onValueChange={handleDurationChange} disabled={isRunning}>
            <SelectTrigger className="w-full max-w-[180px] mx-auto">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Minute</SelectItem>
              <SelectItem value="3">3 Minutes</SelectItem>
              <SelectItem value="5">5 Minutes</SelectItem>
              <SelectItem value="10">10 Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default MindfulEatingGuide;