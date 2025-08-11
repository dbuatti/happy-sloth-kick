import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCcw, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

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
  useAuth();

  const { playSound } = useSound();
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold-top' | 'exhale' | 'hold-bottom'>('inhale');
  const [timer, setTimer] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [selectedCycleName, setSelectedCycleName] = useState(breathCycles[0].name);

  const currentBreathCycle = useMemo(() => breathCycles.find(c => c.name === selectedCycleName) || breathCycles[0], [selectedCycleName]);

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

  const handleReset = useCallback(() => {
    playSound('reset');
    setIsRunning(false);
    setPhaseIndex(0);
    setTimer(cyclePhases[0]?.duration || 0);
  }, [playSound, cyclePhases]);

  useEffect(() => {
    handleReset();
  }, [selectedCycleName, handleReset]);

  const getPhaseText = () => {
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'exhale') return 'Exhale';
    return 'Hold';
  };

  const animationProps = {
    scale: phase === 'inhale' || phase === 'hold-top' ? 1.2 : 0.7,
    opacity: phase === 'inhale' || phase === 'hold-top' ? 1 : 0.8,
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col items-center justify-center p-4 transition-colors ease-in-out",
      isRunning && phase === 'inhale' && "duration-[4000ms] bg-blue-50 dark:bg-blue-950",
      isRunning && phase === 'exhale' && "duration-[8000ms] bg-purple-50 dark:bg-purple-950",
      (!isRunning || phase.startsWith('hold')) && "duration-1000 bg-background"
    )}>
      <Card className="w-full max-w-md shadow-lg rounded-2xl text-center bg-background/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Wind className="h-6 w-6 text-primary" /> Interactive Breathing
          </CardTitle>
          <p className="text-muted-foreground">Follow the bubble to regulate your breath.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Select value={selectedCycleName} onValueChange={setSelectedCycleName} disabled={isRunning}>
              <SelectTrigger className="w-full max-w-[240px] mx-auto h-9 text-base">
                <SelectValue placeholder="Select breathing cycle" />
              </SelectTrigger>
              <SelectContent>
                {breathCycles.map(cycle => <SelectItem key={cycle.name} value={cycle.name}>{cycle.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{currentBreathCycle.description}</p>
          </div>

          <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
            <motion.div
              className="absolute w-full h-full rounded-full border-2 border-primary/10"
              animate={animationProps}
              transition={{ duration: currentPhaseData?.duration || 1, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-3/4 h-3/4 rounded-full border-2 border-primary/10"
              animate={animationProps}
              transition={{ duration: currentPhaseData?.duration || 1, ease: 'easeInOut', delay: 0.1 }}
            />
            <motion.div
              className="w-48 h-48 rounded-full bg-primary shadow-2xl shadow-primary/30 flex items-center justify-center"
              animate={animationProps}
              transition={{ duration: currentPhaseData?.duration || 1, ease: 'easeInOut' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase + timer}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-center text-primary-foreground"
                >
                  <p className="text-2xl font-bold">{isRunning ? getPhaseText() : 'Start'}</p>
                  {isRunning && <p className="text-5xl font-light mt-2">{timer}</p>}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button size="lg" onClick={handleStartPause} className={cn("w-28 h-9 text-base", isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90")} disabled={cyclePhases.length === 0}>
              {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button size="lg" variant="outline" onClick={handleReset} className="w-28 h-9 text-base">
              <RefreshCcw className="h-6 w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default BreathingBubblePage;