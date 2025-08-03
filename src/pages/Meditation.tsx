import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RotateCcw, Leaf } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { useAuth } from '@/context/AuthContext'; // Re-introduced useAuth

const Meditation: React.FC = () => {
  // Removed 'user' from useAuth destructuring as it's not directly used here.
  useAuth(); 

  const { playSound } = useSound();
  const [duration, setDuration] = useState(10 * 60); // Default to 10 minutes in seconds
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
            playSound('alert'); // Play alert sound when timer finishes
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
    if (timeRemaining <= 0) {
      setTimeRemaining(duration);
    }
    setIsRunning(true);
    setIsSessionActive(true);
    playSound('start');
  }, [timeRemaining, duration, playSound]);

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

  const handleDurationChange = useCallback((value: string) => {
    const newDuration = parseInt(value) * 60;
    setDuration(newDuration);
    if (!isRunning) { // Only reset timeRemaining if timer is not running
      setTimeRemaining(newDuration);
    }
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeRemaining / duration) * 100;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg rounded-xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Leaf className="h-7 w-7 text-primary" /> Meditation Timer
          </CardTitle>
          <p className="text-muted-foreground">
            Find your calm and focus.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <Progress
              value={progressValue}
              className="absolute w-full h-full rounded-full bg-muted"
              indicatorClassName={cn(
                "transition-all duration-1000 ease-linear",
                "bg-primary"
              )}
            />
            <div className="relative z-10 text-5xl font-bold text-primary-foreground">
              {formatTime(timeRemaining)}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              size="lg"
              onClick={isRunning ? pauseTimer : startTimer}
              className={cn(
                "w-28 h-9 text-base",
                isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
              )}
              disabled={timeRemaining === 0 && isSessionActive}
            >
              {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button size="lg" variant="outline" onClick={resetTimer} className="w-28 h-9 text-base">
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Select Duration:</p>
            <Select value={(duration / 60).toString()} onValueChange={handleDurationChange} disabled={isRunning}>
              <SelectTrigger className="w-full max-w-[180px] mx-auto h-9 text-base">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Minutes</SelectItem>
                <SelectItem value="10">10 Minutes</SelectItem>
                <SelectItem value="15">15 Minutes</SelectItem>
                <SelectItem value="20">20 Minutes</SelectItem>
                <SelectItem value="30">30 Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Meditation;