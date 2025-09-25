import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import { useSettings } from '@/context/SettingsContext';
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { CalendarDays, CalendarWeek } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('daily');

  const {
    processedTasks, // Use processedTasks for TaskOverviewDialog
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((_task: Task) => {
    setIsTaskOverviewOpen(false);
    // Logic to open task edit form if needed
  }, []);

  return (
    <div className="flex-1 overflow-auto p-4 lg:p-6">
      <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" /> Time Block Schedule
          </CardTitle>
          <p className="text-muted-foreground">Plan your day and week by blocking out time for tasks and appointments.</p>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Daily View
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarWeek className="h-4 w-4" /> Weekly View
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
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks} // Pass processedTasks here
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;