import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Play, Pause, RefreshCcw, Mountain, Home, TreePine, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface ImageryTheme {
  name: string;
  icon: React.ElementType;
  description: string;
  script: string[];
}

const imageryThemes: ImageryTheme[] = [
  {
    name: 'Peaceful Forest',
    icon: TreePine,
    description: 'Imagine a serene forest, filled with calming sounds and sights.',
    script: [
      'Find a comfortable position, close your eyes, and take a few deep breaths.',
      'Imagine yourself standing at the edge of a beautiful, peaceful forest.',
      'The air is fresh and clean, carrying the scent of pine and damp earth.',
      'Sunlight filters through the canopy, creating dappled patterns on the forest floor.',
      'You hear the gentle rustling of leaves in the breeze, and perhaps the distant chirping of birds.',
      'Walk slowly into the forest, feeling the soft ground beneath your feet.',
      'Notice the tall, ancient trees surrounding you, offering a sense of protection and stability.',
      'You come across a clear, babbling brook. The sound of the water is soothing and rhythmic.',
      'Find a comfortable spot by the brook, perhaps a mossy rock or a soft patch of grass.',
      'Sit or lie down, feeling completely safe and at peace in this natural sanctuary.',
      'Allow any tension to melt away as you absorb the tranquility of the forest.',
      'You are completely safe here. This is your peaceful place.',
      'When you are ready, slowly bring your awareness back to your body and the room.',
    ],
  },
  {
    name: 'Cozy Room',
    icon: Home,
    description: 'Visualize a warm, safe, and comforting indoor space.',
    script: [
      'Settle into a comfortable position, close your eyes, and take a few deep breaths.',
      'Imagine yourself in your ideal cozy room. It could be a room you know, or one you create in your mind.',
      'Notice the soft lighting, perhaps from a gentle lamp or a warm fireplace.',
      'The air is warm and comforting, carrying a pleasant, subtle scent.',
      'You are surrounded by soft textures – a plush blanket, a comfortable chair, a warm rug.',
      'Feel the sense of security and privacy this room offers. You are completely safe here.',
      'There are no demands, no expectations, just pure comfort and peace.',
      'Allow yourself to sink deeper into relaxation, feeling completely at ease.',
      'This is your sanctuary, a place where you can truly rest and recharge.',
      'You are completely safe here. This is your peaceful place.',
      'When you are ready, slowly bring your awareness back to your body and the room.',
    ],
  },
  {
    name: 'Mountain Vista',
    icon: Mountain,
    description: 'Picture yourself on a vast, open mountain top, feeling expansive and free.',
    script: [
      'Find a comfortable position, close your eyes, and take a few deep breaths.',
      'Imagine yourself standing on a high mountain peak, overlooking a vast landscape.',
      'The air is crisp and clean, invigorating your lungs.',
      'Below you, mountains stretch into the distance, covered in forests and perhaps snow-capped peaks.',
      'The sky above is wide and clear, a brilliant blue or a canvas of stars.',
      'Feel the solid ground beneath your feet, connecting you to the strength of the mountain.',
      'Notice the sense of spaciousness and freedom that surrounds you.',
      'Any worries or tensions feel small and distant from this vantage point.',
      'You are strong, stable, and unburdened here, connected to the vastness of nature.',
      'You are completely safe here. This is your peaceful place.',
      'When you are ready, slowly bring your awareness back to your body and the room.',
    ],
  },
];

const GuidedImageryPage: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const { playSound } = useSound();
  const [selectedThemeName, setSelectedThemeName] = useState(imageryThemes[0].name);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0); // Total time for the session
  const [isRunning, setIsRunning] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentTheme = imageryThemes.find(t => t.name === selectedThemeName) || imageryThemes[0];
  const CurrentIcon = currentTheme.icon;

  // Calculate total duration based on script length (approx 30s per instruction)
  const totalDuration = currentTheme.script.length * 30; // Adjust as needed

  useEffect(() => {
    // Reset state when theme changes
    setIsRunning(false);
    setIsSessionComplete(false);
    setCurrentScriptIndex(0);
    setTimeRemaining(totalDuration);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [selectedThemeName, totalDuration]);

  const startTimer = useCallback(() => {
    if (timeRemaining <= 0 && !isSessionComplete) { // If starting fresh or from a reset state
      setTimeRemaining(totalDuration);
      setCurrentScriptIndex(0);
      setIsSessionComplete(false);
    }
    
    if (timeRemaining > 0) {
      setIsRunning(true);
      playSound('start');
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsSessionComplete(true);
            playSound('complete');
            return 0;
          }
          // Advance script every ~30 seconds (or adjust based on script length)
          const newScriptIndex = Math.floor((totalDuration - (prevTime - 1)) / 30);
          if (newScriptIndex > currentScriptIndex) {
            setCurrentScriptIndex(newScriptIndex);
          }
          return prevTime - 1;
        });
      }, 1000);
    }
  }, [timeRemaining, totalDuration, currentScriptIndex, isSessionComplete, playSound]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('pause');
  }, [playSound]);

  const resetMeditation = useCallback(() => {
    pauseTimer();
    setIsSessionComplete(false);
    setCurrentScriptIndex(0);
    setTimeRemaining(totalDuration);
    playSound('reset');
  }, [pauseTimer, totalDuration, playSound]);

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

  const progressValue = (timeRemaining / totalDuration) * 100;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-md shadow-lg rounded-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <CurrentIcon className="h-6 w-6 text-primary" /> Guided Imagery
            </CardTitle>
            <p className="text-muted-foreground">
              Visualize a peaceful place to find calm and safety.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Select value={selectedThemeName} onValueChange={setSelectedThemeName} disabled={isRunning}>
                <SelectTrigger className="w-full max-w-[240px] mx-auto h-9">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {imageryThemes.map(theme => (
                    <SelectItem key={theme.name} value={theme.name}>
                      <div className="flex items-center gap-2">
                        <theme.icon className="h-4 w-4" /> {theme.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{currentTheme.description}</p>
            </div>

            {isSessionComplete ? (
              <div className="text-center space-y-4">
                <Sparkles className="h-16 w-16 text-primary mx-auto animate-bounce" />
                <p className="text-xl font-semibold">Meditation Complete!</p>
                <p className="text-muted-foreground">You've completed your guided imagery session.</p>
                <Button onClick={resetMeditation} className="h-9">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Start Over
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Current Instruction:</p>
                  <p className="text-md text-foreground min-h-[60px] flex items-center justify-center">
                    {currentTheme.script[currentScriptIndex]}
                  </p>
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
                    {formatTime(timeRemaining)}
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button
                    size="lg"
                    onClick={isRunning ? pauseTimer : startTimer}
                    className={cn(
                      "w-28 h-9",
                      isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                    )}
                    disabled={timeRemaining === 0 && !isRunning}
                  >
                    {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button size="lg" variant="outline" onClick={resetMeditation} className="w-28 h-9">
                    <RefreshCcw className="h-6 w-6" />
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

export default GuidedImageryPage;