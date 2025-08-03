import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, RefreshCcw, Lightbulb, Laugh, MessageSquare, Repeat, Cloud, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

type DiffusionTechnique = 'none' | 'funny-voice' | 'having-thought' | 'repeat' | 'floating-away';

const ThoughtDiffusionToolPage: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

  const { playSound } = useSound();
  const [originalThought, setOriginalThought] = useState('');
  const [displayedThought, setDisplayedThought] = useState<React.ReactNode>(''); // Changed type to React.ReactNode
  const [activeTechnique, setActiveTechnique] = useState<DiffusionTechnique>('none');
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const repetitionDuration = 30; // seconds for repetition technique

  useEffect(() => {
    setDisplayedThought(originalThought);
    setIsComplete(false);
    if (activeTechnique === 'none') {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(0);
      setRepetitionCount(0);
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
    setRepetitionCount(0);
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
    setRepetitionCount(0);
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
              Change your relationship with difficult thoughts.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Textarea
                placeholder="Type a worrying or intrusive thought here..."
                value={originalThought}
                onChange={(e) => setOriginalThought(e.target.value)}
                rows={3}
                disabled={isRunning}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={activeTechnique === 'funny-voice' ? 'default' : 'outline'}
                onClick={() => applyTechnique('funny-voice')}
                disabled={!originalThought.trim() || isRunning}
                className="h-9"
              >
                <Laugh className="mr-2 h-4 w-4" /> Funny Voice
              </Button>
              <Button
                variant={activeTechnique === 'having-thought' ? 'default' : 'outline'}
                onClick={() => applyTechnique('having-thought')}
                disabled={!originalThought.trim() || isRunning}
                className="h-9"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> "I'm having the thought..."
              </Button>
              <Button
                variant={activeTechnique === 'repeat' ? 'default' : 'outline'}
                onClick={() => applyTechnique('repeat')}
                disabled={!originalThought.trim()}
                className="h-9"
              >
                <Repeat className="mr-2 h-4 w-4" /> Repeat
              </Button>
              <Button
                variant={activeTechnique === 'floating-away' ? 'default' : 'outline'}
                onClick={() => applyTechnique('floating-away')}
                disabled={!originalThought.trim() || isRunning}
                className="h-9"
              >
                <Cloud className="mr-2 h-4 w-4" /> Floating Away
              </Button>
            </div>

            <div className="min-h-[100px] p-4 border rounded-xl bg-muted flex items-center justify-center text-center text-lg font-semibold text-foreground break-words">
              {isComplete && activeTechnique === 'repeat' ? (
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <p>Thought diffused!</p>
                </div>
              ) : (
                displayedThought || "Your diffused thought will appear here."
              )}
            </div>

            {activeTechnique === 'repeat' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Repeat the thought aloud or silently for {repetitionDuration} seconds.</p>
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-muted" />
                  <div className="relative z-10 text-5xl font-bold text-foreground">
                    {timer}s
                  </div>
                </div>
                <div className="flex justify-center space-x-4">
                  <Button
                    size="lg"
                    onClick={handlePlayPause}
                    className={cn(
                      "w-28 h-9",
                      isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
                    )}
                    disabled={isComplete}
                  >
                    {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => applyTechnique('repeat')} className="w-28 h-9" disabled={isRunning}>
                    <RefreshCcw className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}

            {activeTechnique === 'floating-away' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Imagine your thought written on a cloud, a leaf floating down a stream, or a balloon drifting into the sky. Watch it get smaller and smaller until it disappears.
                </p>
              </div>
            )}

            <Button onClick={handleReset} className="w-full h-9" variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset Tool
            </Button>
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