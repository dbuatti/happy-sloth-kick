import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCcw, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';

// Mini Breathing Bubble Component for Focus Mode
const MiniBreathingBubble: React.FC = () => {
  const { playSound } = useSound();
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold-top' | 'exhale' | 'hold-bottom'>('inhale');
  const [timer, setTimer] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  const currentBreathCycle = useMemo(() => ({ name: 'Box Breathing (4-4-4-4)', inhale: 4, holdTop: 4, exhale: 4, holdBottom: 4, description: 'Calming and focusing, equal phases.' }), []);

  const cyclePhases = useMemo(() => [
    { name: 'Inhale', duration: currentBreathCycle.inhale, animationKeyframe: 'breathe-in' },
    { name: 'Hold', duration: currentBreathCycle.holdTop, animationKeyframe: null },
    { name: 'Exhale', duration: currentBreathCycle.exhale, animationKeyframe: 'breathe-out' },
    { name: 'Hold', duration: currentBreathCycle.holdBottom, animationKeyframe: null },
  ].filter(p => p.duration > 0), [currentBreathCycle]);

  const currentPhaseData = cyclePhases[phaseIndex];

  useEffect(() => {
    if (!isRunning || cyclePhases.length === 0) {
      return;
    }

    const currentPhase = cyclePhases[phaseIndex];
    setTimer(currentPhase.duration);

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPhaseIndex(prev => (prev + 1) % cyclePhases.length);
    }, currentPhase.duration * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRunning, phaseIndex, cyclePhases]);

  useEffect(() => {
    if (cyclePhases.length > 0) {
      const currentPhase = cyclePhases[phaseIndex];
      let newPhaseState: typeof phase;
      if (currentPhase.name === 'Inhale') newPhaseState = 'inhale';
      else if (currentPhase.name === 'Exhale') newPhaseState = 'exhale';
      else newPhaseState = phaseIndex === 1 || (cyclePhases.length === 2 && phaseIndex === 0) ? 'hold-top' : 'hold-bottom';
      setPhase(newPhaseState);
    }
  }, [phaseIndex, cyclePhases]);

  const handleStartPause = () => {
    setIsRunning(prev => {
      const newState = !prev;
      if (newState) {
        playSound('start');
      } else {
        playSound('pause');
      }
      return newState;
    });
  };

  const handleReset = () => {
    playSound('reset');
    setIsRunning(false);
    setPhaseIndex(0);
    setTimer(cyclePhases[0]?.duration || 0);
  };

  const getPhaseText = () => {
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'exhale') return 'Exhale';
    return 'Hold';
  };

  return (
    <Card className="w-full shadow-lg rounded-xl text-center">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
          <Wind className="h-5 w-5 text-primary" /> Breathing Exercise
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          <div
            className={cn(
              "w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold transition-transform duration-500 ease-in-out",
            )}
            style={{
              animation: isRunning && currentPhaseData?.animationKeyframe
                ? `${currentPhaseData.animationKeyframe} ${currentPhaseData.duration}s ease-in-out forwards`
                : 'none',
              transform: (isRunning && currentPhaseData?.animationKeyframe)
                ? undefined
                : (phase === 'hold-top' || phase === 'inhale' ? 'scale(1.2)' : 'scale(0.7)'),
            }}
          >
            {isRunning ? getPhaseText() : 'Start'}
          </div>
          {isRunning && (
            <div className="absolute bottom-2 text-xs text-muted-foreground">
              {timer}s
            </div>
          )}
        </div>
        <div className="flex justify-center space-x-2">
          <Button size="sm" onClick={handleStartPause} className={cn(isRunning ? "bg-accent hover:bg-accent/90 h-9 text-base" : "bg-primary hover:bg-primary/90 h-9 text-base")}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset} className="h-9 text-base">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MiniBreathingBubble;