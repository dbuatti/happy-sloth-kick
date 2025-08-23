import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MyHubProps } from '@/types';
import { useAuth } from '@/context/AuthContext';
import GratitudeJournal from '@/components/GratitudeJournal';
import WorryJournal from '@/components/WorryJournal';

const MyHub: React.FC<MyHubProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  if (authLoading) {
    return <div className="p-4 text-center">Loading My Hub...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Hub</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GratitudeJournal isDemo={isDemo} demoUserId={demoUserId} />
        <WorryJournal isDemo={isDemo} demoUserId={demoUserId} />
        {/* Add other personal growth components here */}
      </div>
    </div>
  );
};

export default MyHub;