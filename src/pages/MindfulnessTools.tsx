import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Eye, Wind, Sparkles, UtensilsCrossed, ScanEye, MessageSquare, Armchair } from 'lucide-react';
import MindfulnessToolCard from '@/components/MindfulnessToolCard'; // Import the new card component
import WorryJournal from '@/components/WorryJournal';
import GratitudeJournal from '@/components/GratitudeJournal';
// Removed useAuth as it's not directly used here

const MindfulnessTools: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex flex-col items-center space-y-8">
        <h1 className="text-4xl font-bold text-center mb-4">Mindfulness Tools</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Journals remain embedded */}
          <WorryJournal />
          <GratitudeJournal />

          {/* Tools now use MindfulnessToolCard linking to dedicated pages */}
          <MindfulnessToolCard
            title="5-4-3-2-1 Sensory Tool"
            description="Ground yourself in the present moment by engaging your five senses."
            icon={Eye}
            link="/mindfulness/sensory-tool"
          />
          <MindfulnessToolCard
            title="Interactive Breathing"
            description="Follow guided breathing cycles to regulate your breath and calm your mind."
            icon={Wind}
            link="/mindfulness/breathing-bubble"
          />
          <MindfulnessToolCard
            title="Body Scan Meditation"
            description="Systematically bring awareness to different parts of your body to release tension."
            icon={ScanEye}
            link="/mindfulness/body-scan"
          />
          <MindfulnessToolCard
            title="Mindful Eating Guide"
            description="Practice mindful eating to savor your food and improve your relationship with it."
            icon={UtensilsCrossed}
            link="/mindfulness/mindful-eating"
          />
          <MindfulnessToolCard
            title="Progressive Muscle Relaxation"
            description="Systematically tense and relax muscle groups to release physical tension."
            icon={Armchair}
            link="/mindfulness/pmr"
          />
          <MindfulnessToolCard
            title="Guided Imagery"
            description="Visualize a peaceful place to find calm, safety, and mental escape."
            icon={Sparkles}
            link="/mindfulness/guided-imagery"
          />
          <MindfulnessToolCard
            title="Thought Diffusion"
            description="Change your relationship with difficult or intrusive thoughts using various techniques."
            icon={MessageSquare}
            link="/mindfulness/thought-diffusion"
          />
        </div>
      </main>
      <footer className="p-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default MindfulnessTools;