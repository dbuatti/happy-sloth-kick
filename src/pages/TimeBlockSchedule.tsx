"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/context/AuthContext';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(today.setDate(diff));
  });

  return (
    <div className="flex-1 p-4 overflow-auto">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">Time Block Schedule</CardTitle>
        </CardHeader>
        <Tabs defaultValue="daily" className="w-full">
          <div className="flex justify-center p-4">
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="daily">Daily View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="daily">
            <DailyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={userId}
              onOpenTaskOverview={() => {}} // Placeholder, as TaskOverviewDialog is not directly used here
            />
          </TabsContent>
          <TabsContent value="weekly">
            <WeeklyScheduleView
              currentWeekStart={currentWeekStart}
              setCurrentWeekStart={setCurrentWeekStart}
              isDemo={isDemo}
              demoUserId={userId}
              onOpenTaskOverview={() => {}} // Placeholder, as TaskOverviewDialog is not directly used here
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default TimeBlockSchedule;