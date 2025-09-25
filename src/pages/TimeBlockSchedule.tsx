import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from '@/context/SettingsContext';
import { useTasks } from '@/hooks/useTasks';
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, CalendarWeek } from 'lucide-react';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { settings } = useSettings(); // Renamed to settings as it's used in ScheduleGridContent
  const [activeTab, setActiveTab] = useState('daily');

  const {
    processedTasks, // Used for TaskOverviewDialog
    updateTask, // Used for TaskOverviewDialog
    deleteTask, // Used for TaskOverviewDialog
    sections, // Used for TaskOverviewDialog
    allCategories, // Used for TaskOverviewDialog
    createSection, // Used for TaskOverviewDialog
    updateSection, // Used for TaskOverviewDialog
    deleteSection, // Used for TaskOverviewDialog
    updateSectionIncludeInFocusMode, // Used for TaskOverviewDialog
  } = useTasks({ currentDate, userId: demoUserId });

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<any>(null);

  const handleOpenTaskOverview = (task: any) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Schedule
          </CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarWeek className="h-4 w-4" /> Weekly
            </TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            <DailyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={demoUserId}
              onOpenTaskOverview={handleOpenTaskOverview}
            />
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            <WeeklyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={demoUserId}
              onOpenTaskOverview={handleOpenTaskOverview}
            />
          </TabsContent>
        </Tabs>
      </Card>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskOverview} // Pass the same handler for edit
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;