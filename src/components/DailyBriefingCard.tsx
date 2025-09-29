"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyBriefingCardProps {
  briefing: string | null;
  isLoading: boolean;
  isError: boolean;
}

const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({ briefing, isLoading, isError }) => {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Your Daily Briefing
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Failed to load daily briefing. Please try again later.
          </p>
        ) : briefing ? (
          <p className="text-sm text-muted-foreground">
            {briefing}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No daily briefing available for today.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyBriefingCard;