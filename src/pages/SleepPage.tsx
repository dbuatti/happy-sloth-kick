import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, BarChart, BookOpen } from 'lucide-react';
import { startOfDay } from 'date-fns';
import SleepTracker from './SleepTracker';
import SleepDashboard from './SleepDashboard';
import SleepDiaryView from './SleepDiaryView';
import { SleepPageProps } from '@/types';

const SleepPage: React.FC<SleepPageProps> = ({ isDemo = false, demoUserId }) => {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = isDemo ? demoUserId : user?.id;

  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

  if (authLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!currentUserId) {
    return <div className="flex justify-center items-center h-full text-red-500">User not authenticated.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Sleep Management</h1>

      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracker">
            <CalendarIcon className="mr-2 h-4 w-4" /> Tracker
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart className="mr-2 h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="diary">
            <BookOpen className="mr-2 h-4 w-4" /> Diary
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="mt-4">
          <SleepTracker currentDate={currentDate} setCurrentDate={setCurrentDate} isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <SleepDashboard dateRange={undefined} setDateRange={() => {}} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="diary" className="mt-4">
          <SleepDiaryView isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SleepPage;