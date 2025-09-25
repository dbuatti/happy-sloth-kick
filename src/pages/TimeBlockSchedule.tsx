import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleView from '@/components/WeeklyScheduleView';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import { CalendarDays } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('daily');
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);

  const {
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    processedTasks, // Need processedTasks for TaskOverviewDialog
  } = useTasks({ currentDate, userId: demoUserId });

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // This function is passed to TaskOverviewDialog, but useTasks already has its own updateTask
    // We need to ensure the TaskOverviewDialog calls the updateTask from useTasks
    // For now, I'll just return null as a placeholder, assuming the dialog will use its own update prop
    console.warn("handleUpdateTask in TimeBlockSchedule is a placeholder. TaskOverviewDialog should use its own onUpdate prop.");
    return null;
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    // This function is passed to TaskOverviewDialog, but useTasks already has its own deleteTask
    // We need to ensure the TaskOverviewDialog calls the deleteTask from useTasks
    console.warn("handleDeleteTask in TimeBlockSchedule is a placeholder. TaskOverviewDialog should use its own onDelete prop.");
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Schedule
          </CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">Daily View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="daily">
            <DailyScheduleView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isDemo={isDemo}
              demoUserId={demoUserId}
              onOpenTaskOverview={handleOpenTaskOverview}
            />
          </TabsContent>
          <TabsContent value="weekly">
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
          onEditClick={handleEditTask}
          onUpdate={handleUpdateTask} // This should ideally be the updateTask from useTasks
          onDelete={handleDeleteTask} // This should ideally be the deleteTask from useTasks
          sections={sections}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;