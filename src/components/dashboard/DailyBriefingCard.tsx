import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDailyBriefing } from '@/integrations/supabase/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyBriefingCardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const today = new Date();
  const formattedDate = format(today, 'yyyy-MM-dd');

  const { data: briefing, isLoading, isError, error } = useQuery({
    queryKey: ['dailyBriefing', userId, formattedDate],
    queryFn: () => {
      if (!userId) return Promise.resolve(null);
      return getDailyBriefing(userId, today);
    },
    enabled: !!userId && !isDemo, // Only enable query if user exists and not in demo mode
    staleTime: 1000 * 60 * 60, // Briefing can be stale for 1 hour
    refetchOnWindowFocus: false,
  });

  if (isDemo) {
    return (
      <fieldset className="rounded-xl border-2 border-border p-4 h-full">
        <legend className="px-2 text-sm font-medium text-foreground/80 -ml-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Your Daily Briefing
        </legend>
        <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">AI Briefing is not available in demo mode.</p>
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="rounded-xl border-2 border-border p-4 h-full">
      <legend className="px-2 text-sm font-medium text-foreground/80 -ml-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        Your Daily Briefing
      </legend>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : isError ? (
        <div className="text-center py-8 flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg">
          <Sparkles className="h-12 w-12 text-destructive mb-4" />
          <p className="text-sm text-muted-foreground">Failed to load briefing. Please try again later.</p>
          {error && <p className="text-xs text-destructive mt-1">{error.message}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {briefing || "No briefing available for today. Make sure you have some tasks or appointments!"}
        </p>
      )}
    </fieldset>
  );
};

export default DailyBriefingCard;