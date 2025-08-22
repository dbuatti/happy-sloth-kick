import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSettings } from '@/hooks/useSettings';
import { useCustomDashboardCards } from '@/hooks/useCustomDashboardCards';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Task, Project, CustomDashboardCard as CustomDashboardCardType } from '@/types/task'; // Removed unused TaskSection, TaskCategory
import { Button } from '@/components/ui/button'; // Added Button import
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddTaskForm from '@/components/AddTaskForm';
import DailyBriefingCard from '@/components/dashboard/DailyBriefingCard';
import NextTaskCard from '@/components/dashboard/NextTaskCard';
import CustomDashboardCard from '@/components/dashboard/CustomDashboardCard';
import QuickLinks from '@/components/dashboard/QuickLinks';
import { DashboardPageProps, AddTaskFormProps, TaskOverviewDialogProps, TaskDetailDialogProps, FullScreenFocusViewProps } from '@/types/props';
import { TaskOverviewDialog } from '@/components/TaskOverviewDialog';
import { TaskDetailDialog } from '@/components/TaskDetailDialog';
import FullScreenFocusView from '@/components/FullScreenFocusView';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers'; // Corrected import

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
  // Removed unused isProjectNotesOpen
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
    onStatusChange,
    isLoading: tasksLoading, // Destructured isLoading from useTasks
    error: tasksError, // Destructured error from useTasks
  } = useTasks({ userId: userId, currentDate: currentDate, viewMode: 'all' });

  const {
    updateProject,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects({ userId });

  const { isLoading: settingsLoading, error: settingsError } = useSettings({ userId });
  const { customDashboardCards, isLoading: cardsLoading, error: cardsError, upsertCustomDashboardCard, deleteCustomDashboardCard } = useCustomDashboardCards({ userId });
  const { dashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats({ userId });

  const handleNewTaskSubmit = async (taskData: Partial<Task>) => {
    const newTask = await handleAddTask(taskData);
    if (newTask) {
      setIsAddTaskDialogOpen(false);
      setPrefilledTaskData(null);
    }
    return newTask;
  };

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

  // Removed unused handleEditProjectNotes, handleSaveProjectNotes, handleStatusChangeWrapper

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: () => ({ x: 0, y: 0 }), // Placeholder, removed unused 'args'
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = customDashboardCards.findIndex(card => card.id === active.id);
      const newIndex = customDashboardCards.findIndex(card => card.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(customDashboardCards, oldIndex, newIndex);
        const updates = newOrder.map((card, index) => ({
          id: card.id,
          card_order: index,
        }));

        for (const update of updates) {
          await upsertCustomDashboardCard(update);
        }
      }
    }
  };

  const addTaskFormProps: AddTaskFormProps = {
    onAddTask: handleNewTaskSubmit,
    onTaskAdded: () => setIsAddTaskDialogOpen(false),
    sections: sections,
    allCategories: allCategories,
    currentDate: currentDate,
    createSection: createSection,
    updateSection: updateSection,
    deleteSection: deleteSection,
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    initialData: prefilledTaskData,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onReorderTasks: reorderTasks,
    onStatusChange: onStatusChange,
  };

  const taskOverviewDialogProps: TaskOverviewDialogProps = {
    isOpen: isOverviewOpen,
    onClose: () => setIsOverviewOpen(false),
    task: selectedTask,
    onOpenDetail: handleOpenDetail,
    onOpenFocusView: handleOpenFocusView,
    onUpdate: updateTask, // Changed from updateTask
    onDelete: deleteTask, // Changed from deleteTask
    sections: sections,
    allCategories: allCategories,
    allTasks: tasks,
    onAddTask: handleAddTask,
    onReorderTasks: reorderTasks,
    createSection: createSection,
    updateSection: updateSection,
    deleteSection: deleteSection,
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    onStatusChange: onStatusChange,
  };

  const taskDetailDialogProps: TaskDetailDialogProps = {
    isOpen: isDetailOpen,
    onClose: () => setIsDetailOpen(false),
    task: selectedTask,
    onUpdate: updateTask, // Changed from updateTask
    onDelete: deleteTask, // Changed from deleteTask
    sections: sections,
    allCategories: allCategories,
    allTasks: tasks,
    createSection: createSection,
    updateSection: updateSection,
    deleteSection: deleteSection,
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    onAddTask: handleAddTask,
    onReorderTasks: reorderTasks,
    onStatusChange: onStatusChange,
  };

  const fullScreenFocusViewProps: FullScreenFocusViewProps = {
    task: selectedTask!,
    onClose: () => setIsFocusViewOpen(false),
    onComplete: () => {
      updateTask(selectedTask!.id, { status: 'completed' });
      setIsFocusViewOpen(false);
    },
    onSkip: () => {
      updateTask(selectedTask!.id, { status: 'skipped' });
      setIsFocusViewOpen(false);
    },
    onOpenDetail: handleOpenDetail,
    onUpdate: updateTask, // Changed from updateTask
    sections: sections,
    allCategories: allCategories,
    allTasks: tasks,
    onAddTask: handleAddTask,
    onReorderTasks: reorderTasks,
    createSection: createSection,
    updateSection: updateSection,
    deleteSection: deleteSection,
    updateSectionIncludeInFocusMode: updateSectionIncludeInFocusMode,
    createCategory: createCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    onDelete: deleteTask, // Changed from deleteTask
    onStatusChange: onStatusChange,
  };

  if (isLoading) {
    return <div className="p-4 md:p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 md:p-6 text-red-500">Error loading dashboard: {error?.message}</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <DailyBriefingCard
          tasksDue={dashboardStats?.tasksDueToday || 0}
          appointmentsToday={dashboardStats?.appointmentsToday || 0}
          tasksCompleted={0}
          isLoading={statsLoading}
        />
        <NextTaskCard
          nextAvailableTask={nextAvailableTask}
          sections={sections}
          allCategories={allCategories}
          onOpenOverview={handleOpenOverview}
          onOpenFocusView={handleOpenFocusView}
        />
        <QuickLinks isDemo={isDemo} demoUserId={userId} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <SortableContext items={customDashboardCards.map(card => card.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {customDashboardCards.map((card) => (
              <CustomDashboardCard
                key={card.id}
                card={card}
                onEdit={upsertCustomDashboardCard}
                onDelete={deleteCustomDashboardCard}
                onReorder={async (cardId, newOrder) => {
                  await upsertCustomDashboardCard({ id: cardId, card_order: newOrder });
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <AddTaskForm {...addTaskFormProps} />
        </DialogContent>
      </Dialog>

      <TaskOverviewDialog {...taskOverviewDialogProps} />
      <TaskDetailDialog {...taskDetailDialogProps} />
      {isFocusViewOpen && selectedTask && <FullScreenFocusView {...fullScreenFocusViewProps} />}

      {/* Project Notes Dialog */}
      {/* <ProjectNotesDialog
        isOpen={isProjectNotesOpen}
        onClose={() => setIsProjectNotesOpen(false)}
        project={selectedProject!}
        onSaveNotes={handleSaveProjectNotes}
      /> */}
    </div>
  );
};

export default DashboardPage;