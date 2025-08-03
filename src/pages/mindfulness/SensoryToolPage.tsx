import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Hand, Ear, Soup, Utensils, RefreshCcw, Sparkles } from 'lucide-react';
import { useSound } from '@/context/SoundContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

const SensoryToolPage: React.FC = () => {
  const { user } = useAuth(); // Use useAuth to get the user
  const userId = user?.id; // Get userId from useAuth

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
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-md shadow-lg rounded-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Eye className="h-6 w-6 text-primary" /> 5-4-3-2-1 Sensory Tool
            </CardTitle>
            <p className="text-muted-foreground">
              Ground yourself in the present moment.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 0 ? (
              <div className="text-center space-y-4">
                <Sparkles className="h-16 w-16 text-primary mx-auto animate-bounce" />
                <p className="text-xl font-semibold">Exercise Complete!</p>
                <p className="text-muted-foreground">You've successfully grounded yourself.</p>
                <Button onClick={handleReset} className="h-9">
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
                  <Button variant="outline" onClick={handlePrevious} disabled={step === 5 && promptIndex === 0} className="h-9">
                    Previous
                  </Button>
                  <Button onClick={handleNext} className="h-9">
                    {step === 1 && promptIndex === currentPrompts.length - 1 ? "Finish" : "Next"}
                  </Button>
                </div>
                <Button variant="ghost" onClick={handleReset} className="w-full h-9">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
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

export default SensoryToolPage;