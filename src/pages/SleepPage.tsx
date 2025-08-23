import React, { useState } from 'react';
import SleepTracker from './SleepTracker';
import SleepDashboard from './SleepDashboard';
import SleepDiaryView from './SleepDiaryView';
import { SleepPageProps } from '@/types';
import { startOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SleepPage: React.FC<SleepPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sleep Management</h2>
      </div>

      <Tabs defaultValue="tracker" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="diary">Diary</TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="space-y-4">
          <SleepTracker currentDate={currentDate} setCurrentDate={setCurrentDate} isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="dashboard" className="space-y-4">
          <SleepDashboard isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="diary" className="space-y-4">
          <SleepDiaryView isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SleepPage;