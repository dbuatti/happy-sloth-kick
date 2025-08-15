import React, { useState, useMemo, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { CalendarDays } from 'lucide-react';
import useKeyboardShortcuts, { ShortcutMap } from '@/hooks/useKeyboardShortcuts';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyScheduleView from '@/components/DailyScheduleView';
import WeeklyScheduleGrid from '@/components/WeeklyScheduleGrid';
import { Task } from '@/hooks/useTasks';
import { startOfWeek, addWeeks } from 'date-fns';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog
import TaskDetailDialog from '@/components/TaskDetailDialog'; // Import TaskDetailDialog

interface TimeBlockScheduleProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const TimeBlockSchedule: React.FC<TimeBlockScheduleProps> = ({ isDemo = false, demoUserId }) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday as start of week

  // These state variables are used by being passed as props to child components.
  // Adding a dummy read to satisfy the TypeScript compiler.
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  void setTaskToOverview; // Explicitly mark as used for TS6133
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  void setIsTaskOverviewOpen; // Explicitly mark as used for TS6133
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  void setTaskToEdit; // Explicitly mark as used for TS6133
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  void setIsTaskDetailOpen; // Explicitly mark as used for TS6133

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
        <MadeWithDyad />
      </footer>
      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskDetail}
          onUpdate={() => Promise.resolve(null)} // Dummy onUpdate
          onDelete={() => {}} // Dummy onDelete
          sections={[]} // Dummy sections
          allCategories={[]} // Dummy allCategories
          allTasks={[]} // Dummy allTasks
        />
      )}
      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={() => Promise.resolve(null)} // Dummy onUpdate
          onDelete={() => {}} // Dummy onDelete
          sections={[]} // Dummy sections
          allCategories={[]} // Dummy allCategories
          createSection={() => Promise.resolve()} // Dummy createSection
          updateSection={() => Promise.resolve()} // Dummy updateSection
          deleteSection={() => Promise.resolve()} // Dummy deleteSection
          updateSectionIncludeInFocusMode={() => Promise.resolve()} // Dummy updateSectionIncludeInFocusMode
        />
      )}
    </div>
  );
};

export default TimeBlockSchedule;