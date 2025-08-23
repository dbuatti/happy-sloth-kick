import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, BarChart, BookOpen } from 'lucide-react';
import SleepTracker from './SleepTracker';
import SleepDashboard from './SleepDashboard';
import SleepDiaryView from './SleepDiaryView';
import { SleepPageProps } from '@/types';
import { format, startOfDay } from 'date-fns';

const SleepPage: React.FC<SleepPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

  return (
    <div className="p-4">
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
        <TabsContent value="tracker">
          <SleepTracker currentDate={currentDate} setCurrentDate={setCurrentDate} isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="dashboard">
          <SleepDashboard isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
        <TabsContent value="diary">
          <SleepDiaryView isDemo={isDemo} demoUserId={demoUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SleepPage;