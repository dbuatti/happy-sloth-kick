import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import BulkActionBar from '@/components/BulkActionBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useAllAppointments } from '@/hooks/useAllAppointments';

interface ArchivePageProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchivePageProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date()); // currentDate is not directly used for filtering in archive mode, but needed for useTasks hook
  const isMobile = useIsMobile();

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    sectionFilter,
    setSectionFilter,
    sections,
    allCategories,
    updateTaskParentAndOrder,
    reorderSections,
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, viewMode: 'archive', userId: demoUserId });

  const { appointments: allAppointments } = useAllAppointments();
  const scheduledTasksMap = new Map(allAppointments.filter(app => app.task_id).map(app => [app.task_id!, app]));

  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const taskListRef = useRef<any>(null);

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !(prev[taskId] ?? true) }));
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !(prev[sectionId] ?? true) }));
  }, []);

  const toggleAllSections = useCallback(() => {
    const allExpanded = Object.values(expandedSections).every(val => val === true);
    const newExpandedState: Record<string, boolean> = {};
    sections.forEach(section => {
      newExpandedState[section.id] = !allExpanded;
    });
    newExpandedState['no-section-header'] = !allExpanded;
    setExpandedSections(newExpandedState);
  }, [expandedSections, sections]);

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskClick = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleBulkComplete = async () => {
    await bulkUpdateTasks({ status: 'completed' }, selectedTasks);
    setSelectedTasks([]);
  };

  const handleBulkArchive = async () => {
    await bulkUpdateTasks({ status: 'archived' }, selectedTasks);
    setSelectedTasks([]);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteTasks(selectedTasks);
    setSelectedTasks([]);
  };

  const handleBulkChangePriority = async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, selectedTasks);
    setSelectedTasks([]);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArchiveIcon className="h-7 w-7 text-primary" /> Archived Tasks
        </h2>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Your Archived Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList
            ref={taskListRef}
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={loading}
            handleAddTask={handleAddTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            bulkUpdateTasks={bulkUpdateTasks}
            markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            reorderSections={reorderSections}
            allCategories={allCategories}
            setIsAddTaskOpen={() => {}}
            onOpenOverview={handleOpenOverview}
            currentDate={currentDate}
            expandedSections={expandedSections}
            expandedTasks={expandedTasks}
            toggleTask={toggleTask}
            toggleSection={toggleSection}
            toggleAllSections={toggleAllSections}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
          />
        </CardContent>
      </Card>

      {selectedTasks.length > 0 && !isMobile && (
        <BulkActionBar
          selectedCount={selectedTasks.length}
          onClearSelection={() => setSelectedTasks([])}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      <TaskDetailDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onEditClick={handleEditTaskClick}
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
      />
    </div>
  );
};

export default Archive;