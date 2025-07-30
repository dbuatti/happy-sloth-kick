import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Eye, Hand, Ear, Soup, Utensils, RefreshCcw, Play, Pause, Leaf, Wind, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import WorryJournal from '@/components/WorryJournal'; // Import WorryJournal
import GratitudeJournal from '@/components/GratitudeJournal'; // Import GratitudeJournal
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import BodyScanMeditation from '@/components/BodyScanMeditation'; // Import BodyScanMeditation
import MindfulEatingGuide from '@/components/MindfulEatingGuide'; // Import MindfulEatingGuide

// 5-4-3-2-1 Sensory Tool Component
const SensoryTool: React.FC = () => {
  const { playSound } = useSound();
  const [step, setStep] = useState(5);
  const [promptIndex, setPromptIndex] = useState(0);

  const prompts = {
    5: [
      { icon: Eye, text: "Name 5 things you can SEE around you." },
      { icon: Eye, text: "Look for 5 objects of a specific color (e.g., blue)." },
      { icon: Eye, text: "Find 5 different shapes." },
    ],
    4: [
      { icon: Hand, text: "Name 4 things you can TOUCH and feel." },
      { icon: Hand, text: "Notice 4 different textures." },
      { icon: Hand, text: "Feel 4 parts of your body touching a surface." },
    ],
    3: [
      { icon: Ear, text: "Name 3 things you can HEAR." },
      { icon: Ear, text: "Listen for 3 distinct sounds." },
      { icon: Ear, text: "Identify 3 sounds that are far away." },
    ],
    2: [
      { icon: Soup, text: "Name 2 things you can SMELL." },
      { icon: Soup, text: "Take two deep breaths and notice any scents." },
      { icon: Soup, text: "Identify 2 smells, even subtle ones." },
    ],
    1: [
      { icon: Utensils, text: "Name 1 thing you can TASTE." },
      { icon: Utensils, text: "Notice the taste in your mouth right now." },
      { icon: Utensils, text: "If safe, take a sip of water and focus on its taste." },
    ],
  };

  const currentPrompts = prompts[step as keyof typeof prompts];
  const CurrentIcon = currentPrompts[promptIndex].icon;

  const handleNext = () => {
    playSound('success');
    if (promptIndex < currentPrompts.length - 1) {
      setPromptIndex(prev => prev + 1);
    } else if (step > 1) {
      setStep(prev => prev - 1);
      setPromptIndex(0);
    } else {
      // End of exercise
      setStep(0); // Indicate completion
    }
  };

  const handlePrevious = () => {
    playSound('reset');
    if (promptIndex > 0) {
      setPromptIndex(prev => prev - 1);
    } else if (step < 5 && step > 0) {
      setStep(prev => prev + 1);
      setPromptIndex(prompts[step + 1 as keyof typeof prompts].length - 1);
    } else if (step === 0) { // If completed, go back to step 1
      setStep(1);
      setPromptIndex(0);
    }
  };

  const handleReset = () => {
    playSound('reset');
    setStep(5);
    setPromptIndex(0);
  };

  return (
    <Card className="w-full max-w-md shadow-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Eye className="h-6 w-6 text-purple-600" /> 5-4-3-2-1 Sensory Tool
        </CardTitle>
        <p className="text-muted-foreground">
          Ground yourself in the present moment.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 ? (
          <div className="text-center space-y-4">
            <Sparkles className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
            <p className="text-xl font-semibold">Exercise Complete!</p>
            <p className="text-muted-foreground">You've successfully grounded yourself.</p>
            <Button onClick={handleReset}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Start Over
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-6xl font-extrabold text-primary">{step}</div>
              <CurrentIcon className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-semibold text-center">{currentPrompts[promptIndex].text}</p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button variant="outline" onClick={handlePrevious} disabled={step === 5 && promptIndex === 0}>
                Previous
              </Button>
              <Button onClick={handleNext}>
                {step === 1 && promptIndex === currentPrompts.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
            <Button variant="ghost" onClick={handleReset} className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

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

// Interactive Breathing Bubble Component
const BreathingBubble: React.FC = () => {
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
  ].filter(p => p.duration > 0); // Filter out phases with 0 duration

  const currentPhaseData = cyclePhases[phaseIndexRef.current];

  const startCycle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (cyclePhases.length === 0) { // Handle case where a cycle might have all 0 durations
      setIsRunning(false);
      return;
    }

    const currentPhaseDuration = cyclePhases[phaseIndexRef.current].duration;
    
    let newPhaseState: typeof phase;
    if (cyclePhases[phaseIndexRef.current].name === 'Inhale') {
      newPhaseState = 'inhale';
    } else if (cyclePhases[phaseIndexRef.current].name === 'Exhale') {
      newPhaseState = 'exhale';
    } else { // It's a 'Hold' phase
      if (phaseIndexRef.current === 1 || (cyclePhases.length === 2 && phaseIndexRef.current === 0)) { // This is the hold after inhale (or first phase if only 2)
        newPhaseState = 'hold-top';
      } else { // This is the hold after exhale
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
          startCycle(); // Move to next phase
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cyclePhases]); // Dependency on cyclePhases to react to cycle changes

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

  // Reset when selected cycle changes
  useEffect(() => {
    handleReset();
  }, [selectedCycleName]);

  const handleStartPause = () => {
    setIsRunning(prev => {
      const newState = !prev;
      if (newState) {
        // If starting, ensure we reset to the beginning of the cycle if it was paused mid-way
        if (timer === 0 || timer === currentPhaseData.duration) { // If timer is at 0 or full duration, it's a fresh start or end of a full cycle
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
    setPhase('inhale'); // Always start with inhale visually
    setTimer(cyclePhases[0]?.duration || 0); // Reset timer to first phase duration
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const getPhaseText = () => {
    // Map internal phase state back to display text
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'exhale') return 'Exhale';
    return 'Hold';
  };

  return (
    <Card className="w-full max-w-md shadow-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Wind className="h-6 w-6 text-blue-600" /> Interactive Breathing
        </CardTitle>
        <p className="text-muted-foreground">
          Follow the bubble to regulate your breath.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Select value={selectedCycleName} onValueChange={setSelectedCycleName} disabled={isRunning}>
            <SelectTrigger className="w-full max-w-[240px] mx-auto">
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
              "w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold transition-transform duration-500 ease-in-out",
            )}
            style={{
              animation: isRunning && currentPhaseData?.animationKeyframe
                ? `${currentPhaseData.animationKeyframe} ${currentPhaseData.duration}s ease-in-out forwards`
                : 'none',
              transform: (isRunning && currentPhaseData?.animationKeyframe)
                ? undefined // Let animation handle transform
                : (phase === 'hold-top' || phase === 'inhale' ? 'scale(1.2)' : 'scale(0.7)'), // Explicitly set for non-animated states
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
            onClick={handleStartPause}
            className={cn(
              "w-24",
              isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"
            )}
            disabled={cyclePhases.length === 0}
          >
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button size="lg" variant="outline" onClick={handleReset} className="w-24">
            <RefreshCcw className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const MindfulnessTools: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex flex-col items-center space-y-8">
        <h1 className="text-4xl font-bold text-center mb-4">Mindfulness Tools</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <SensoryTool />
          <BreathingBubble />
          <WorryJournal />
          <GratitudeJournal />
          <BodyScanMeditation />
          <MindfulEatingGuide /> {/* New: Add the MindfulEatingGuide component */}
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default MindfulnessTools;