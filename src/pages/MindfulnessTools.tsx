import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Eye, Hand, Ear, Soup, Utensils, RefreshCcw, Play, Pause, Leaf, Wind, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSound } from '@/context/SoundContext';
import WorryJournal from '@/components/WorryJournal';
import GratitudeJournal from '@/components/GratitudeJournal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BodyScanMeditation from '@/components/BodyScanMeditation';
import MindfulEatingGuide from '@/components/MindfulEatingGuide';
import ProgressiveMuscleRelaxation from '@/components/ProgressiveMuscleRelaxation';
import GuidedImagery from '@/components/GuidedImagery';
import ThoughtDiffusionTool from '@/components/ThoughtDiffusionTool';
import SensoryTool from '@/components/SensoryTool'; // Import new SensoryTool
import BreathingBubble from '@/components/BreathingBubble'; // Import new BreathingBubble

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
          <MindfulEatingGuide />
          <ProgressiveMuscleRelaxation />
          <GuidedImagery />
          <ThoughtDiffusionTool />
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default MindfulnessTools;