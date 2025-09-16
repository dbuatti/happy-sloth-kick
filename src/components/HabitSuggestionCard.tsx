import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HabitSuggestionCardProps {
  suggestion: string | null;
  isLoading: boolean;
  isDemo?: boolean;
}

const HabitSuggestionCard: React.FC<HabitSuggestionCardProps> = ({ suggestion, isLoading, isDemo = false }) => {
  if (isDemo) {
    return (
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Habit Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center pt-0">
          <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">AI suggestions are not available in demo mode.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Habit Suggestion
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <p className="text-sm text-muted-foreground">Generating suggestion...</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {suggestion || "No suggestions at the moment. Keep up the great work!"}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HabitSuggestionCard;