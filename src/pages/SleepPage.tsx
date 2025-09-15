import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, BarChart3, Bed, BookOpen, BookText } from 'lucide-react';
import SleepTracker from './SleepTracker';
import SleepDashboard from './SleepDashboard';
import SleepDiaryView from './SleepDiaryView';
import { DateRange } from 'react-day-picker';
import { startOfMonth } from 'date-fns';
import SleepResources from './SleepResources';

interface SleepPageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const SleepPage: React.FC<SleepPageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }));

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4 flex justify-center">
        <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Moon className="h-7 w-7 text-primary" /> Sleep Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="tracker" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tracker">
                  <Bed className="h-4 w-4 mr-2" /> Tracker
                </TabsTrigger>
                <TabsTrigger value="dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="diary">
                  <BookOpen className="h-4 w-4 mr-2" /> Diary
                </TabsTrigger>
                <TabsTrigger value="resources">
                  <BookText className="h-4 w-4 mr-2" /> Resources
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tracker" className="mt-4">
                <SleepTracker currentDate={currentDate} setCurrentDate={setCurrentDate} isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
              <TabsContent value="dashboard" className="mt-4">
                <SleepDashboard dateRange={analyticsDateRange} setDateRange={setAnalyticsDateRange} isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
              <TabsContent value="diary" className="mt-4">
                <SleepDiaryView isDemo={isDemo} demoUserId={demoUserId} />
              </TabsContent>
              <TabsContent value="resources" className="mt-4">
                <SleepResources />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <footer className="p-4">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SleepPage;