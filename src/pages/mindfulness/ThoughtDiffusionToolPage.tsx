import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, RefreshCcw, Lightbulb, Laugh, MessageSquare, Repeat, Cloud, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext'; // Re-introduced useAuth

type DiffusionTechnique = 'none' | 'funny-voice' | 'having-thought' | 'repeat' | 'floating-away';

const ThoughtDiffusionToolPage: React.FC = () => {
  const { user } = useAuth(); // Re-introduced user as it's used
  // userId is used by useAuth hook internally, no need to declare here if not directly used

  const { playSound } = useSound();
  const [originalThought, setOriginalThought] = useState('');
  const [displayedThought, setDisplayedThought] = useState<React.ReactNode>(''); // Changed type to React.ReactNode
  const [activeTechnique, setActiveTechnique] = useState<DiffusionTechnique>('none');
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Removed repetitionCount as it's not directly used in this component's logic
  const [isComplete, setIsComplete] = useState(false);

  const repetitionDuration = 30; // seconds for repetition technique

  useEffect(() => {
    setDisplayedThought(originalThought);
    setIsComplete(false);
    if (activeTechnique === 'none') {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
      // Removed setRepetitionCount(0);
    }
  }, [originalThought, activeTechnique]);

  useEffect(() => {
    if (isRunning && activeTechnique === 'repeat') {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev >= repetitionDuration - 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsComplete(true);
            playSound('complete');
            return repetitionDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, activeTechnique, playSound]);

  const applyTechnique = useCallback((technique: DiffusionTechnique) => {
    if (!originalThought.trim()) {
      // Optionally show an error toast
      return;
    }
    setActiveTechnique(technique);
    setIsRunning(false);
    setIsComplete(false);
    setTimer(0);
    // Removed setRepetitionCount(0);
    playSound('start');

    switch (technique) {
      case 'funny-voice':
        setDisplayedThought(<span className="italic">{originalThought}</span>); // Simplified styling
        break;
      case 'having-thought':
        setDisplayedThought(`I'm having the thought that... "${originalThought}"`);
        break;
      case 'repeat':
        setDisplayedThought(originalThought);
        setTimer(0); // Reset timer for repetition
        setIsRunning(true); // Start timer immediately for repetition
        break;
      case 'floating-away':
        setDisplayedThought(originalThought);
        break;
      default:
        setDisplayedThought(originalThought);
        break;
    }
  }, [originalThought, playSound]);

  const handleReset = useCallback(() => {
    setOriginalThought('');
    setDisplayedThought('');
    setActiveTechnique('none');
    setIsRunning(false);
    setIsComplete(false);
    setTimer(0);
    // Removed setRepetitionCount(0);
    if (timerRef.current) clearInterval(timerRef.current);
    playSound('reset');
  }, [playSound]);

  const handlePlayPause = useCallback(() => {
    if (activeTechnique === 'repeat') {
      setIsRunning(prev => !prev);
      if (!isRunning) playSound('start'); else playSound('pause');
    }
  }, [activeTechnique, isRunning, playSound]);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-md shadow-lg rounded-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" /> Thought Diffusion
            </CardTitle>
            <p className="text-muted-foreground">
              Change your relationship with difficult or intrusive thoughts.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Your Thought:</h3>
              <Textarea
                placeholder="Enter your thought here..."
                value={originalThought}
                onChange={(e) => setOriginalThought(e.target.value)}
                rows={3}
                className="min-h-[80px] text-base"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Choose a Technique:</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activeTechnique === 'funny-voice' ? 'default' : 'outline'}
                  onClick={() => applyTechnique('funny-voice')}
                  disabled={!originalThought.trim()}
                  className="h-10 text-base flex items-center justify-center gap-2"
                >
                  <Laugh className="h-4 w-4" /> Funny Voice
                </Button>
                <Button
                  variant={activeTechnique === 'having-thought' ? 'default' : 'outline'}
                  onClick={() => applyTechnique('having-thought')}
                  disabled={!originalThought.trim()}
                  className="h-10 text-base flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" /> "I'm Having The Thought..."
                </Button>
                <Button
                  variant={activeTechnique === 'repeat' ? 'default' : 'outline'}
                  onClick={() => applyTechnique('repeat')}
                  disabled={!originalThought.trim()}
                  className="h-10 text-base flex items-center justify-center gap-2"
                >
                  <Repeat className="h-4 w-4" /> Repeat (30s)
                </Button>
                <Button
                  variant={activeTechnique === 'floating-away' ? 'default' : 'outline'}
                  onClick={() => applyTechnique('floating-away')}
                  disabled={!originalThought.trim()}
                  className="h-10 text-base flex items-center justify-center gap-2"
                >
                  <Cloud className="h-4 w-4" /> Floating Away
                </Button>
              </div>
            </div>

            {activeTechnique !== 'none' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Diffused Thought:</h3>
                <div className="bg-muted/50 p-4 rounded-lg min-h-[80px] flex items-center justify-center text-center text-foreground text-xl font-medium">
                  {displayedThought}
                </div>

                {activeTechnique === 'repeat' && (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="text-4xl font-bold text-primary">{timer}s</div>
                    <div className="flex space-x-2">
                      <Button
                        size="lg"
                        onClick={handlePlayPause}
                        className={cn(
                          "w-28 h-9 text-base",
                          isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                        )}
                        disabled={isComplete}
                      >
                        {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleReset} className="w-28 h-9 text-base">
                        <RefreshCcw className="h-6 w-6" />
                      </Button>
                    </div>
                    {isComplete && (
                      <div className="text-center space-y-2 mt-4">
                        <Sparkles className="h-12 w-12 text-primary mx-auto animate-bounce" />
                        <p className="text-lg font-semibold">Technique Complete!</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTechnique !== 'repeat' && (
                  <Button onClick={handleReset} className="w-full h-9 text-base">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset Tool
                  </Button>
                )}
              </div>
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

export default ThoughtDiffusionToolPage;