import React, { useState } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTasks } from '@/hooks/useTasks'; // Removed Task import as it's now from types
import { Task } from '@/types/task'; // Corrected import
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog'; // Named import
import { TaskDetailDialog } from '@/components/TaskDetailDialog'; // Named import
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { DailyBriefingCard } from '@/components/dashboard/DailyBriefingCard';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddTaskForm } from '@/components/AddTaskForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomDashboardCard } from '@/components/dashboard/CustomDashboardCard';
import { useSettings } from '@/context/SettingsContext';
import { useProjects } from '@/hooks/useProjects';
import { ProjectBalanceCard } from '@/components/dashboard/ProjectBalanceCard';
import { QuickLinksCard } from '@/components/dashboard/QuickLinksCard';
import { WeeklyFocusCard } from '@/components/dashboard/WeeklyFocusCard';
import { GratitudeJournalCard } from '@/components/dashboard/GratitudeJournalCard';
import { WorryJournalCard } from '@/components/dashboard/WorryJournalCard';
import { SleepTrackerCard } from '@/components/dashboard/SleepTrackerCard';
import { PeopleMemoryCard } from '@/components/dashboard/PeopleMemoryCard';
import { DailyTaskCount } from '@/types/task'; // Import DailyTaskCount
import { DailyTasksHeader } from '@/components/DailyTasksHeader'; // Named import

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const isDemo = user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);

  const {
    tasks,
    processedTasks,
    activeTasks,
    nextAvailableTask,
    sections,
    allCategories, // Correctly destructured
    doTodayOffIds,
    handleAddTask, // Correctly destructured
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleDoToday,
    toggleAllDoToday,
    archiveAllCompletedTasks,
    setFocusTask,
    isLoading,
    error,
    currentDate, // Correctly destructured
  } = useTasks({ userId: userId, currentDate: new Date() });

  const { data: stats } = useDashboardStats(userId);
  const { data: projects } = useProjects(userId);
  const { data: settings } = useSettings(userId);

  const handleOpenOverview = (task: Task) => {
    setSelectedTask(task);
    setIsOverviewOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleOpenFocusView = (task: Task) => {
    setSelectedTask(task);
    setIsFocusViewOpen(true);
  };

  const handleNewTaskSubmit = async (taskData: Partial<Task>) => {
    const newTask = await handleAddTask(taskData);
    if (newTask) {
      setIsAddTaskDialogOpen(false);
      setPrefilledTaskData(null);
    }
    return newTask;
  };

  const dailyProgress: DailyTaskCount = {
    totalPendingCount: activeTasks.filter(t => t.status === 'to-do' && !doTodayOffIds.has(t.id)).length,
    completedCount: activeTasks.filter(t => t.status === 'completed').length,
    overdueCount: activeTasks.filter(t => t.status === 'to-do' && t.due_date && new Date(t.due_date) < currentDate && !doTodayOffIds.has(t.id)).length,
  };

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <DailyBriefingCard />
        <NextTaskCard
          nextAvailableTask={nextAvailableTask}
          updateTask={updateTask}
          onOpenOverview={handleOpenOverview}
          onOpenDetail={handleOpenDetail}
          sections={sections}
          categories={allCategories}
          isDemo={isDemo}
        />
        <ProjectBalanceCard
          projects={projects || []}
          title={settings?.project_tracker_title || 'Project Balance Tracker'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <QuickLinksCard />
        <WeeklyFocusCard />
        <GratitudeJournalCard />
        <WorryJournalCard />
        <SleepTrackerCard />
        <PeopleMemoryCard />
        {/* Render custom cards */}
        {settings?.dashboard_layout?.map((card: any) => (
          <CustomDashboardCard key={card.id} card={card} />
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsAddTaskDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <TaskOverviewDialog
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        task={selectedTask}
        onOpenDetail={handleOpenDetail}
        onOpenFocusView={handleOpenFocusView}
        updateTask={updateTask}
        deleteTask={deleteTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      <TaskDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={selectedTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        categories={allCategories}
        allTasks={tasks}
        onAddTask={handleAddTask}
        onReorderTasks={reorderTasks}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        createCategory={createCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
      />

      {isFocusViewOpen && selectedTask && (
        <FullScreenFocusView
          task={selectedTask}
          onClose={() => setIsFocusViewOpen(false)}
          onComplete={() => {
            updateTask(selectedTask.id, { status: 'completed' });
            setIsFocusViewOpen(false);
          }}
          onSkip={() => {
            updateTask(selectedTask.id, { status: 'skipped' });
            setIsFocusViewOpen(false);
          }}
          onOpenDetail={handleOpenDetail}
          updateTask={updateTask}
          sections={sections}
          categories={allCategories}
          allTasks={tasks}
          onAddTask={handleAddTask}
          onReorderTasks={reorderTasks}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          createCategory={createCategory}
          updateCategory={updateCategory}
          deleteCategory={deleteCategory}
        />
      )}

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm
            onAddTask={handleNewTaskSubmit}
            onTaskAdded={() => setIsAddTaskDialogOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            initialData={prefilledTaskData}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;