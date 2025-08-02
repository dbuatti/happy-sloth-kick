import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, ScanEye, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { MadeWithDyad } from '@/components/made-with-dyad';

interface BodyScanStep {
  part: string;
  duration: number; // in seconds
  instruction: string;
}

const defaultSteps: BodyScanStep[] = [
  { part: 'Feet', duration: 30, instruction: 'Bring your awareness to your feet. Notice any sensations: warmth, coolness, pressure, tingling.' },
  { part: 'Legs', duration: 30, instruction: 'Move your attention up to your legs. Feel your calves, shins, knees, and thighs.' },
  { part: 'Hips & Pelvis', duration: 30, instruction: 'Shift your focus to your hips and pelvis. Notice how your body connects with the surface you are on.' },
  { part: 'Abdomen', duration: 30, instruction: 'Bring awareness to your abdomen. Feel the gentle rise and fall with each breath.' },
  { part: 'Chest & Back', duration: 30, instruction: 'Expand your awareness to your chest and upper back. Notice your breath moving in and out.' },
  { part: 'Arms & Hands', duration: 30, instruction: 'Direct your attention to your arms and hands. Feel your fingertips, palms, and the length of your arms.' },
  { part: 'Neck & Shoulders', duration: 30, instruction: 'Move to your neck and shoulders. Notice any tension and allow it to soften.' },
  { part: 'Face & Head', duration: 30, instruction: 'Bring your awareness to your face and head. Relax your jaw, forehead, and scalp.' },
  { part: 'Whole Body', duration: 60, instruction: 'Now, expand your awareness to your entire body. Feel your body as a whole, breathing and present.' },
];

const BodyScanMeditationPage: React.FC = () => {
  const { playSound } = useSound();
  const [steps, setSteps] = useState<BodyScanStep[]>(defaultSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemainingInStep, setTimeRemainingInStep] = useState(steps[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isMeditationComplete, setIsMeditationComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    playSound('start');

    timerRef.current = setInterval(() => {
      setTimeRemainingInStep(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prevIndex => prevIndex + 1);
            playSound('success'); // Chime for step transition
          } else {
            setIsRunning(false);
            setIsMeditationComplete(true);
            playSound('complete'); // Sound for meditation completion
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [currentStepIndex, steps.length, playSound]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('pause');
  }, [playSound]);

  const resetMeditation = useCallback(() => {
    pauseTimer();
    setCurrentStepIndex(0);
    setTimeRemainingInStep(steps[0].duration);
    setIsMeditationComplete(false);
    playSound('reset');
  }, [pauseTimer, steps, playSound]);

  const goToNextStep = useCallback(() => {
    pauseTimer();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prevIndex => prevIndex + 1);
    } else {
      setIsMeditationComplete(true);
    }
  }, [currentStepIndex, steps.length, pauseTimer]);

  const goToPreviousStep = useCallback(() => {
    pauseTimer();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prevIndex => prevIndex - 1);
      setIsMeditationComplete(false); // If going back from complete state
    }
  }, [currentStepIndex, pauseTimer]);

  useEffect(() => {
    if (currentStepIndex < steps.length) {
      setTimeRemainingInStep(steps[currentStepIndex].duration);
      if (isRunning) {
        startTimer(); // Restart timer for new step
      }
    }
  }, [currentStepIndex, steps, isRunning, startTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressValue = (timeRemainingInStep / currentStep.duration) * 100;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <ScanEye className="h-6 w-6 text-primary" /> Body Scan Meditation
            </CardTitle>
            <p className="text-muted-foreground">
              Systematically bring awareness to your body.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {isMeditationComplete ? (
              <div className="text-center space-y-4">
                <ScanEye className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
                <p className="text-xl font-semibold">Meditation Complete!</p>
                <p className="text-muted-foreground">You've completed the body scan.</p>
                <Button onClick={resetMeditation} className="h-9"> {/* Adjusted height */}
                  <RefreshCcw className="mr-2 h-4 w-4" /> Start Over
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}:</p>
                  <h3 className="text-xl font-semibold text-primary">{currentStep.part}</h3>
                  <p className="text-md text-foreground">{currentStep.instruction}</p>
                </div>

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
                    {formatTime(timeRemainingInStep)}
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button
                    size="lg"
                    onClick={isRunning ? pauseTimer : startTimer}
                    className={cn(
                      "w-28 h-10", // Adjusted size
                      isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button size="lg" variant="outline" onClick={resetMeditation} className="w-28 h-10"> {/* Adjusted size */}
                    <RefreshCcw className="h-6 w-6" />
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="ghost" onClick={goToPreviousStep} disabled={currentStepIndex === 0} className="h-9"> {/* Adjusted height */}
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button variant="ghost" onClick={goToNextStep} disabled={currentStepIndex === steps.length - 1} className="h-9"> {/* Adjusted height */}
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default BodyScanMeditationPage;