import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/context/AuthContext';
import { Task } from '@/hooks/useTasks';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { useTasks } from '@/hooks/useTasks'; // Import useTasks to pass to TaskOverviewDialog

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    updateTask,
    deleteTask,
    sections,
    allCategories,
    processedTasks: allTasks, // Use processedTasks for TaskOverviewDialog
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    // In schedule view, we just want to open the overview, not directly edit.
    // The TaskOverviewDialog itself has an edit button that will open TaskDetailDialog.
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold">Schedule</CardTitle>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week')}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <Tabs value={viewMode} className="w-full">
          <TabsContent value="day">
            <DailyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={demoUserId}
              onOpenTaskOverview={handleOpenTaskOverview}
            />
          </TabsContent>
          <TabsContent value="week">
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
          allTasks={allTasks}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;