import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getDailyBriefing } from '@/integrations/supabase/api'; // Corrected import
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const DailyBriefingCard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: briefing, isLoading } = useQuery({
    queryKey: ['dailyBriefing', userId],
    queryFn: () => getDailyBriefing(userId!),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Briefing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Daily Briefing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-700">
        <p>
          You have <span className="font-semibold">{briefing?.tasksDueToday || 0}</span> tasks due today.
        </p>
        <p>
          <span className="font-semibold">{briefing?.appointmentsToday || 0}</span> appointments on your schedule.
        </p>
        <p>
          <span className="font-semibold">{briefing?.focusTasks || 0}</span> tasks are currently in focus mode.
        </p>
      </CardContent>
    </Card>
  );
};

export default DailyBriefingCard;