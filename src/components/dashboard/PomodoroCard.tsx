import React from 'react';
import { Clock } from 'lucide-react';
import PomodoroTimer from '@/components/PomodoroTimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components

const PomodoroCard: React.FC = () => {
  return (
    <Card className="h-full shadow-lg rounded-xl"> {/* Changed from fieldset to Card */}
      <CardHeader className="pb-2"> {/* Adjusted padding */}
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2"> {/* Adjusted font size and alignment */}
          <Clock className="h-5 w-5 text-primary" /> Focus Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0"> {/* Adjusted padding */}
        <PomodoroTimer />
      </CardContent>
    </Card>
  );
};

export default PomodoroCard;