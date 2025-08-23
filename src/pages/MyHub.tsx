import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth } from 'date-fns';
import SleepDashboard from './SleepDashboard';
import SleepDiaryView from './SleepDiaryView';
import { MyHubProps } from '@/types';

const MyHub: React.FC<MyHubProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  if (authLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!currentUserId) {
    return <div className="flex justify-center items-center h-full text-red-500">User not authenticated.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Hub</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Sleep Dashboard</TabsTrigger>
          <TabsTrigger value="diary">Sleep Diary</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <SleepDashboard dateRange={dateRange} setDateRange={setDateRange} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="diary" className="mt-4">
          <SleepDiaryView isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyHub;