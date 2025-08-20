import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, useTasks, UpdateTaskData, NewTaskSectionData, UpdateTaskSectionData, NewCategoryData, UpdateCategoryData } from '@/hooks/useTasks'; // Removed unused Category types
import { useSettings } from '@/context/SettingsContext';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import DailyProgressCard from '@/components/dashboard/DailyProgressCard';
import CustomDashboardCard from '@/components/dashboard/CustomDashboardCard';
import { useCustomDashboardCards } from '@/hooks/useCustomDashboardCards';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useDoToday } from '@/hooks/useDoToday'; // Import useDoToday
import { isSameDay, parseISO } from 'date-fns';

interface DashboardProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ demoUserId }) => { // Removed isDemo as it's unused
  // const { settings } = useSettings(); // Removed unused variable

  const {
    tasks: allTasks, // All tasks (real and generated recurring)
    isLoading: tasksLoading,
    updateTask,
    deleteTask,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useTasks({ userId: demoUserId, currentDate: new Date() });

  const { doTodayOffIds, dailyProgress, updateDailyProgress } = useDoToday({ userId: demoUserId, currentDate: new Date() });

  const {
    customCards,
    isLoading: customCardsLoading,
    createCustomCard, // Kept for potential future use, though not directly used here
    updateCustomCard,
    deleteCustomCard,
    reorderCustomCards, // Kept for potential future use, though not directly used here
  } = useCustomDashboardCards({ userId: demoUserId });

  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);

  const tasksForToday = useMemo(() => {
    return allTasks.filter(task => {
      const isDueToday = task.due_date && isSameDay(parseISO(task.due_date), new Date());
      const isRecurringToday = task.recurring_type !== 'none' && task.recurring_type !== null; // Simplified check, actual recurrence logic is in useTasks

      // Only show tasks due today or recurring for today, unless they are explicitly moved off "Do Today"
      return (isDueToday || isRecurringToday) && !doTodayOffIds.includes(task.id);
    });
  }, [allTasks, doTodayOffIds]);

  const nextAvailableTask = useMemo(() => {
    return tasksForToday.filter(task => task.status === 'to-do')
      .sort((a, b) => (a.order || 0) - (b.order || 0))[0] || null;
  }, [tasksForToday]);

  const handleOpenOverview = (task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  };

  const handleEditTaskFromOverview = (task: Task) => {
    setTaskToOverview(null); // Close overview
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  };

  // Update daily progress whenever tasksForToday changes
  React.useEffect(() => {
    updateDailyProgress(tasksForToday);
  }, [tasksForToday, updateDailyProgress]);

  return (
    <div className="flex-1 flex flex-col p-4">
      <main className="flex-grow">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <Card className="shadow-lg rounded-xl p-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-center">Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Next Task Card */}
              <NextTaskCard
                nextAvailableTask={nextAvailableTask}
                updateTask={updateTask}
                onOpenOverview={handleOpenOverview}
              />

              {/* Daily Progress Card */}
              <DailyProgressCard
                dailyProgress={dailyProgress}
                isLoading={tasksLoading}
              />

              {/* Custom Cards */}
              {customCardsLoading ? (
                <div className="flex justify-center items-center h-32 col-span-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                customCards.map((card) => ( // Explicitly type card
                  <CustomDashboardCard
                    key={card.id}
                    card={card}
                    onUpdate={updateCustomCard}
                    onDelete={deleteCustomCard}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TaskMaster. All rights reserved.</p>
      </footer>

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleEditTaskFromOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allCategories={allCategories}
          allTasks={allTasks} // Pass all tasks for subtask filtering
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
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
          allTasks={allTasks} // Pass all tasks for subtask selection
        />
      )}
    </div>
  );
};

export default Dashboard;