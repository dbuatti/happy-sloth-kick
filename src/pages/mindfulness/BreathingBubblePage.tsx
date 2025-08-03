import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCcw, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface BreathCycle {
  name: string;
  inhale: number;
  holdTop: number;
  exhale: number;
  holdBottom: number;
  description: string;
}

const breathCycles: BreathCycle[] = [
  { name: '4-7-8 Breathing', inhale: 4, holdTop: 7, exhale: 8, holdBottom: 1, description: 'Relaxing breath for sleep and anxiety.' },
  { name: 'Box Breathing (4-4-4-4)', inhale: 4, holdTop: 4, exhale: 4, holdBottom: 4, description: 'Calming and focusing, equal phases.' },
  { name: 'Relaxation Breathing (6-2-8)', inhale: 6, holdTop: 2, exhale: 8, holdBottom: 0, description: 'Longer exhale for deep relaxation.' },
  { name: 'Equal Breathing (4-0-4-0)', inhale: 4, holdTop: 0, exhale: 4, holdBottom: 0, description: 'Simple, balanced inhale and exhale.' },
];

const BreathingBubblePage: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const { playSound } = useSound();
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold-top' | 'exhale' | 'hold-bottom'>('inhale');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIndexRef = useRef(0);
  const [selectedCycleName, setSelectedCycleName] = useState(breathCycles[0].name);

  const currentBreathCycle = breathCycles.find(c => c.name === selectedCycleName) || breathCycles[0];

  const cyclePhases = [
    { name: 'Inhale', duration: currentBreathCycle.inhale, animationKeyframe: 'breathe-in' },
    { name: 'Hold', duration: currentBreathCycle.holdTop, animationKeyframe: null },
    { name: 'Exhale', duration: currentBreathCycle.exhale, animationKeyframe: 'breathe-out' },
    { name: 'Hold', duration: currentBreathCycle.holdBottom, animationKeyframe: null },
  ].filter(p => p.duration > 0);

  const currentPhaseData = cyclePhases[phaseIndexRef.current];

  const startCycle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (cyclePhases.length === 0) {
      setIsRunning(false);
      return;
    }

    const currentPhaseDuration = cyclePhases[phaseIndexRef.current].duration;
    
    let newPhaseState: typeof phase;
    if (cyclePhases[phaseIndexRef.current].name === 'Inhale') {
      newPhaseState = 'inhale';
    } else if (cyclePhases[phaseIndexRef.current].name === 'Exhale') {
      newPhaseState = 'exhale';
    } else {
      if (phaseIndexRef.current === 1 || (cyclePhases.length === 2 && phaseIndexRef.current === 0)) {
        newPhaseState = 'hold-top';
      } else {
        newPhaseState = 'hold-bottom';
      }
    }
    setPhase(newPhaseState);
    setTimer(currentPhaseDuration);

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          phaseIndexRef.current = (phaseIndexRef.current + 1) % cyclePhases.length;
          startCycle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cyclePhases, playSound]);

  useEffect(() => {
    if (isRunning) {
      startCycle();
      playSound('start');
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
  }, [isRunning, startCycle, playSound]);

  useEffect(() => {
    handleReset();
  }, [selectedCycleName]);

  const handleStartPause = () => {
    setIsRunning(prev => {
      const newState = !prev;
      if (newState) {
        if (timer === 0 || timer === currentPhaseData.duration) {
          phaseIndexRef.current = 0;
        }
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
    phaseIndexRef.current = 0;
    setPhase('inhale');
    setTimer(cyclePhases[0]?.duration || 0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const getPhaseText = () => {
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'exhale') return 'Exhale';
    return 'Hold';
  };

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-md shadow-lg rounded-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Wind className="h-6 w-6 text-primary" /> Interactive Breathing
            </CardTitle>
            <p className="text-muted-foreground">
              Follow the bubble to regulate your breath.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Select value={selectedCycleName} onValueChange={setSelectedCycleName} disabled={isRunning}>
                <SelectTrigger className="w-full max-w-[240px] mx-auto h-9">
                  <SelectValue placeholder="Select breathing cycle" />
                </SelectTrigger>
                <SelectContent>
                  {breathCycles.map(cycle => (
                    <SelectItem key={cycle.name} value={cycle.name}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{currentBreathCycle.description}</p>
            </div>

            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <div
                className={cn(
                  "w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold transition-transform duration-500 ease-in-out",
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
                <div className="absolute bottom-4 text-sm text-muted-foreground">
                  {timer}s
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                size="lg"
                onClick={handleStartPause} // Corrected to use handleStartPause
                className={cn(
                  "w-28 h-9",
                  isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                )}
                disabled={cyclePhases.length === 0}
              >
                {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button size="lg" variant="outline" onClick={handleReset} className="w-28 h-9">
                <RefreshCcw className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default BreathingBubblePage;