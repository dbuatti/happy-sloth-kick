import React, { useState, useMemo, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleGrid from '@/components/WeeklyScheduleGrid';
import { Task, useTasks } from '@/hooks/useTasks'; // Import useTasks
import { startOfWeek, addWeeks } from 'date-fns';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog
import TaskDetailDialog from '@/components/TaskDetailDialog'; // Import TaskDetailDialog
import { useSettings } from '@/context/SettingsContext';

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  // Removed `settings` and `updateSettings` as they are no longer directly used here.
  useSettings(); 

  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start of week

  // Fetch allTasks here to pass to TaskDetailDialog
  const {
    tasks: allTasks,
    sections,
    allCategories,
    updateTask,
    deleteTask,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
  } = useTasks({ currentDate: new Date(), userId: demoUserId }); // Pass a dummy date for this global fetch

  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const handleOpenTaskOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleOpenTaskDetail = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  const handlePreviousDay = useCallback(() => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + 1);
      return newDate;
    });
  }, []);

  const handlePreviousWeek = useCallback(() => {
    setCurrentWeekStart(prevWeekStart => addWeeks(prevWeekStart, -1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart(prevWeekStart => addWeeks(prevWeekStart, 1));
  }, []);

  const handleGoToToday = useCallback(() => {
    setCurrentDate(new Date());
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const shortcuts: ShortcutMap = useMemo(() => ({
    'arrowleft': viewMode === 'daily' ? handlePreviousDay : handlePreviousWeek,
    'arrowright': viewMode === 'daily' ? handleNextDay : handleNextWeek,
    't': handleGoToToday,
  }), [viewMode, handlePreviousDay, handleNextDay, handlePreviousWeek, handleNextWeek, handleGoToToday]);
  
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-grow p-4">
        <Card className="w-full max-w-6xl mx-auto shadow-lg rounded-xl p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <CalendarDays className="h-7 w-7" /> Dynamic Schedule
            </CardTitle>
          </CardHeader>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'daily' | 'weekly')} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">Daily View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              <DailyScheduleView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                isDemo={isDemo}
                demoUserId={demoUserId}
                onOpenTaskDetail={handleOpenTaskDetail}
                onOpenTaskOverview={handleOpenTaskOverview}
              />
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              <WeeklyScheduleGrid
                currentWeekStart={currentWeekStart}
                isDemo={isDemo}
                demoUserId={demoUserId}
                onOpenTaskDetail={handleOpenTaskDetail}
                onOpenTaskOverview={handleOpenTaskOverview}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
      <footer className="p-4">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskDetail}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={allTasks}
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={allTasks}
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;