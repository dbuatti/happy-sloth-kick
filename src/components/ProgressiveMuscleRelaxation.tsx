import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, Armchair, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';

interface PMRStep {
  part: string;
  tenseDuration: number; // in seconds
  relaxDuration: number; // in seconds
  instruction: string;
}

const defaultPMRSteps: PMRStep[] = [
  { part: 'Hands & Forearms', tenseDuration: 7, relaxDuration: 15, instruction: 'Clench your fists tightly, feeling the tension in your hands and forearms.' },
  { part: 'Biceps', tenseDuration: 7, relaxDuration: 15, instruction: 'Bend your arms at the elbow and flex your biceps, feeling the tension in your upper arms.' },
  { part: 'Shoulders', tenseDuration: 7, relaxDuration: 15, instruction: 'Shrug your shoulders up towards your ears, feeling the tension in your neck and shoulders.' },
  { part: 'Neck', tenseDuration: 7, relaxDuration: 15, instruction: 'Gently press your head back into your chair or pillow, or pull your chin towards your chest, feeling tension in your neck.' },
  { part: 'Face', tenseDuration: 7, relaxDuration: 15, instruction: 'Wrinkle your forehead, squint your eyes, clench your jaw, and press your tongue to the roof of your mouth.' },
  { part: 'Chest & Abdomen', tenseDuration: 7, relaxDuration: 15, instruction: 'Take a deep breath and hold it, tensing your chest and abdomen. Or, tighten your stomach muscles.' },
  { part: 'Glutes', tenseDuration: 7, relaxDuration: 15, instruction: 'Squeeze your buttocks together tightly.' },
  { part: 'Thighs', tenseDuration: 7, relaxDuration: 15, instruction: 'Press your knees together or push your heels down, tensing your thigh muscles.' },
  { part: 'Calves', tenseDuration: 7, relaxDuration: 15, instruction: 'Point your toes towards your shins, feeling the tension in your calves.' },
  { part: 'Feet', tenseDuration: 7, relaxDuration: 15, instruction: 'Curl your toes tightly downwards, feeling the tension in your feet.' },
  { part: 'Whole Body', tenseDuration: 0, relaxDuration: 30, instruction: 'Now, simply allow your entire body to relax deeply. Notice the feeling of calm spreading throughout.' },
];

const ProgressiveMuscleRelaxation: React.FC = () => {
  const { playSound } = useSound();
  const [steps, setSteps] = useState<PMRStep[]>(defaultPMRSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTensingPhase, setIsTensingPhase] = useState(true); // true for tense, false for relax
  const [timeRemainingInPhase, setTimeRemainingInPhase] = useState(steps[0].tenseDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isMeditationComplete, setIsMeditationComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];
  const currentPhaseDuration = isTensingPhase ? currentStep.tenseDuration : currentStep.relaxDuration;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    playSound('start');

    timerRef.current = setInterval(() => {
      setTimeRemainingInPhase(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current!);
          if (isTensingPhase) {
            // Transition from tense to relax phase
            setIsTensingPhase(false);
            playSound('success'); // Chime for phase transition
            return currentStep.relaxDuration;
          } else {
            // Transition from relax phase to next step
            if (currentStepIndex < steps.length - 1) {
              setCurrentStepIndex(prevIndex => prevIndex + 1);
              setIsTensingPhase(true); // Next step starts with tensing
              playSound('success'); // Chime for step transition
              return steps[currentStepIndex + 1].tenseDuration;
            } else {
              // Meditation complete
              setIsRunning(false);
              setIsMeditationComplete(true);
              playSound('complete'); // Sound for meditation completion
              return 0;
            }
          }
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [currentStepIndex, isTensingPhase, steps, playSound, currentStep.relaxDuration]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('pause');
  }, [playSound]);

  const resetMeditation = useCallback(() => {
    pauseTimer();
    setCurrentStepIndex(0);
    setIsTensingPhase(true);
    setTimeRemainingInPhase(steps[0].tenseDuration);
    setIsMeditationComplete(false);
    playSound('reset');
  }, [pauseTimer, steps, playSound]);

  const goToNextStep = useCallback(() => {
    pauseTimer();
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prevIndex => prevIndex + 1);
      setIsTensingPhase(true); // Always start next step with tensing phase
      setTimeRemainingInPhase(steps[currentStepIndex + 1].tenseDuration);
      setIsMeditationComplete(false); // If going back from complete state
    } else {
      setIsMeditationComplete(true);
    }
  }, [currentStepIndex, steps.length, pauseTimer, steps]);

  const goToPreviousStep = useCallback(() => {
    pauseTimer();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prevIndex => prevIndex - 1);
      setIsTensingPhase(true); // Always go back to tensing phase of previous step
      setTimeRemainingInPhase(steps[currentStepIndex - 1].tenseDuration);
      setIsMeditationComplete(false); // If going back from complete state
    }
  }, [currentStepIndex, pauseTimer, steps]);

  useEffect(() => {
    // When currentStepIndex or isTensingPhase changes, update timeRemainingInPhase
    if (currentStepIndex < steps.length) {
      setTimeRemainingInPhase(isTensingPhase ? currentStep.tenseDuration : currentStep.relaxDuration);
      if (isRunning) {
        startTimer(); // Restart timer for new phase/step
      }
    }
  }, [currentStepIndex, isTensingPhase, steps, isRunning, startTimer, currentStep.tenseDuration, currentStep.relaxDuration]);

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

  const progressValue = (timeRemainingInPhase / currentPhaseDuration) * 100;

  return (
    <Card className="w-full max-w-md shadow-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Armchair className="h-6 w-6 text-purple-600" /> Progressive Muscle Relaxation
        </CardTitle>
        <p className="text-muted-foreground">
          Systematically tense and relax muscle groups to release tension.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isMeditationComplete ? (
          <div className="text-center space-y-4">
            <Armchair className="h-16 w-16 text-green-500 mx-auto animate-bounce" />
            <p className="text-xl font-semibold">PMR Complete!</p>
            <p className="text-muted-foreground">You've completed the relaxation exercise.</p>
            <Button onClick={resetMeditation}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Start Over
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}:</p>
              <h3 className="text-xl font-semibold text-primary">{currentStep.part}</h3>
              <p className="text-md text-foreground">
                {isTensingPhase && currentStep.tenseDuration > 0 ? `Tense: ${currentStep.instruction}` : `Relax: Release all tension in your ${currentStep.part}.`}
              </p>
            </div>

            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <Progress
                value={progressValue}
                className="absolute w-full h-full rounded-full bg-muted"
                indicatorClassName={cn(
                  "transition-all duration-1000 ease-linear",
                  isTensingPhase ? "bg-red-500" : "bg-green-500"
                )}
              />
              <div className="relative z-10 text-5xl font-bold text-foreground">
                {formatTime(timeRemainingInPhase)}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                size="lg"
                onClick={isRunning ? pauseTimer : startTimer}
                className={cn(
                  "w-24",
                  isRunning ? "bg-yellow-500 hover:bg-yellow-600" : "bg-purple-600 hover:bg-purple-700"
                )}
              >
                {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button size="lg" variant="outline" onClick={resetMeditation} className="w-24">
                <RefreshCcw className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={goToPreviousStep} disabled={currentStepIndex === 0 && isTensingPhase}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <Button variant="ghost" onClick={goToNextStep} disabled={currentStepIndex === steps.length - 1 && !isTensingPhase}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressiveMuscleRelaxation;