import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSettings } from '@/hooks/useSettings';
import { useCustomDashboardCards } from '@/hooks/useCustomDashboardCards';
import { useQuickLinks } from '@/hooks/useQuickLinks';
import { useWeeklyFocus } from '@/hooks/useWeeklyFocus';
import { useGratitudeJournal } from '@/hooks/useGratitudeJournal';
import { useWorryJournal } from '@/hooks/useWorryJournal';
import { useSleepRecords } from '@/hooks/useSleepRecords';
import { usePeopleMemory } from '@/hooks/usePeopleMemory';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Task, Project, CustomDashboardCard as CustomDashboardCardType } from '@/types/task';
import { DashboardPageProps } from '@/types/props';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddTaskForm from '@/components/AddTaskForm';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import CustomDashboardCard from '@/components/dashboard/CustomDashboardCard';
import ProjectBalanceCard from '@/components/dashboard/ProjectBalanceCard';
import QuickLinksCard from '@/components/dashboard/QuickLinksCard';
import WeeklyFocusCard from '@/components/dashboard/WeeklyFocusCard';
import GratitudeJournalCard from '@/components/dashboard/GratitudeJournalCard';
import WorryJournalCard from '@/components/dashboard/WorryJournalCard';
import SleepTrackerCard from '@/components/dashboard/SleepTrackerCard';
import PeopleMemoryCard from '@/components/dashboard/PeopleMemoryCard';
import { format, startOfWeek } from 'date-fns';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';

const DashboardPage: React.FC<DashboardPageProps> = ({ isDemo: propIsDemo, demoUserId }) => {
  const { user } = useAuth();
  const userId = user?.id || demoUserId;
  const isDemo = propIsDemo || user?.id === 'd889323b-350c-4764-9788-6359f85f6142';

  const [currentDate] = useState(new Date());
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [prefilledTaskData, setPrefilledTaskData] = useState<Partial<Task> | null>(null);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFocusViewOpen, setIsFocusViewOpen] = useState(false);

  const {
    tasks,
    nextAvailableTask,
    sections,
    allCategories,
    handleAddTask,
    updateTask,
    deleteTask,
    reorderTasks,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    createCategory,
    updateCategory,
    deleteCategory,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks({ userId: userId, currentDate: currentDate, viewMode: 'today' });

  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects({ userId });
  const { settings, isLoading: settingsLoading, error: settingsError } = useSettings({ userId });
  const { customDashboardCards, isLoading: cardsLoading, error: cardsError, addCustomDashboardCard } = useCustomDashboardCards({ userId });
  const { quickLinks, isLoading: quickLinksLoading, error: quickLinksError } = useQuickLinks({ userId });
  const { weeklyFocus, isLoading: weeklyFocusLoading, error: weeklyFocusError } = useWeeklyFocus({ userId, weekStartDate: format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd') });
  const { entries: gratitudeEntries, isLoading: gratitudeLoading, error: gratitudeError } = useGratitudeJournal({ userId });
  const { entries: worryEntries, isLoading: worryLoading, error: worryError } = useWorryJournal({ userId });
  const { sleepRecords, isLoading: sleepLoading, error: sleepError } = useSleepRecords({ userId });
  const { people, isLoading: peopleLoading, error: peopleError } = usePeopleMemory({ userId });
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats({ userId });

  const isLoading = tasksLoading || projectsLoading || settingsLoading || cardsLoading || quickLinksLoading || weeklyFocusLoading || gratitudeLoading || worryLoading || sleepLoading || peopleLoading || statsLoading;
  const error = tasksError || projectsError || settingsError || cardsError || quickLinksError || weeklyFocusError || gratitudeError || worryError || sleepError || peopleError || statsError;

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

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading dashboard: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DailyBriefingCard
          tasksDue={dashboardStats?.tasksDue || 0}
          appointmentsToday={dashboardStats?.appointmentsToday || 0}
          tasksCompleted={dashboardStats?.tasksCompleted || 0}
          isLoading={statsLoading}
        />
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
          projects={projects}
          title={settings?.project_tracker_title || 'Project Balance Tracker'}
        />
        <QuickLinksCard />
        <WeeklyFocusCard />
        <GratitudeJournalCard />
        <WorryJournalCard />
        <SleepTrackerCard />
        <PeopleMemoryCard />

        {customDashboardCards.map((card: CustomDashboardCardType) => (
          <CustomDashboardCard key={card.id} card={card} />
        ))}

        <Button variant="outline" onClick={() => addCustomDashboardCard('New Card', 'Add your content here.', '✨')}>
          <Plus className="mr-2 h-4 w-4" /> Add Custom Card
        </Button>
      </div>

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
            createCategory={createCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            initialData={prefilledTaskData}
          />
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default DashboardPage;