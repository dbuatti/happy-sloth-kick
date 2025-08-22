"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/context/AuthContext';
import Dashboard from './Dashboard';
import DailyTasksV3 from './DailyTasksV3';
import TasksPage from './TasksPage';
import TimeBlockSchedule from './TimeBlockSchedule';
import TaskCalendar from './TaskCalendar';
import FocusMode from './FocusMode';
import Archive from './Archive';
import Analytics from './Analytics'; // Assuming Analytics also exists

const MyHub: React.FC = () => {
  const { user } = useAuth();
  const demoUserId = 'd889323b-350c-4764-9788-6359f85f6142'; // Demo user ID

  // Determine if the current user is the demo user
  const isDemo = user?.id === demoUserId;

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col">
        <div className="w-full overflow-x-auto border-b">
          <TabsList className="h-auto justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="dashboard" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Dashboard</TabsTrigger>
            <TabsTrigger value="daily-tasks" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Daily Tasks</TabsTrigger>
            <TabsTrigger value="all-tasks" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">All Tasks</TabsTrigger>
            <TabsTrigger value="schedule" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Schedule</TabsTrigger>
            <TabsTrigger value="calendar" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Calendar</TabsTrigger>
            <TabsTrigger value="focus-mode" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Focus Mode</TabsTrigger>
            <TabsTrigger value="archive" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Archive</TabsTrigger>
            <TabsTrigger value="analytics" className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 py-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="dashboard" className="mt-0 h-full">
            <Dashboard isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="daily-tasks" className="mt-0 h-full">
            <DailyTasksV3 isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="all-tasks" className="mt-0 h-full">
            <TasksPage isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="schedule" className="mt-0 h-full">
            <TimeBlockSchedule isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-0 h-full">
            <TaskCalendar isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="focus-mode" className="mt-0 h-full">
            <FocusMode isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="archive" className="mt-0 h-full">
            <Archive isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-0 h-full">
            <Analytics isDemo={isDemo} demoUserId={demoUserId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MyHub;