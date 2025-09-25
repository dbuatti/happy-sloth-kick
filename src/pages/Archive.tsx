import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import BulkActionBar from '@/components/BulkActionBar';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments'; // Import Appointment type
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Import TaskOverviewDialog

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const {
    processedTasks,
    filteredTasks,
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
    loading: tasksLoading,
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

  const scheduledTasksMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    allAppointments.forEach(app => {
      if (app.task_id) {
        map.set(app.task_id, app);
      }
    });
    return map;
  }, [allAppointments]);

  const handleOpenTaskOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleOpenTaskEdit = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskOverviewOpen(false); // Close overview if open
  }, []);

  const handleCloseTaskEdit = useCallback(() => {
    setTaskToEdit(null);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const result = await updateTask(taskId, updates);
    if (result) {
      // If the task being edited is the one in overview, update it
      if (taskToOverview && taskToOverview.id === taskId) {
        setTaskToOverview(prev => prev ? { ...prev, ...updates } : null);
      }
      // If the task being edited is the one in edit dialog, update it
      if (taskToEdit && taskToEdit.id === taskId) {
        setTaskToEdit(prev => prev ? { ...prev, ...updates } : null);
      }
    }
    return result;
  }, [updateTask, taskToOverview, taskToEdit]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    if (taskToOverview?.id === taskId) {
      setIsTaskOverviewOpen(false);
      setTaskToOverview(null);
    }
    if (taskToEdit?.id === taskId) {
      setTaskToEdit(null);
    }
  }, [deleteTask, taskToOverview, taskToEdit]);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkArchive = useCallback(async () => {
    await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteTasks(Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkDeleteTasks, selectedTasks, handleClearSelection]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
    handleClearSelection();
  }, [bulkUpdateTasks, selectedTasks, handleClearSelection]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Archive</CardTitle>
          <p className="text-muted-foreground">
            Tasks you've archived. Restore or permanently delete them here.
          </p>
        </CardHeader>
        <CardContent>
          <TaskList
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={tasksLoading}
            handleAddTask={() => {}} // Not adding tasks directly in archive
            updateTask={handleUpdateTask}
            deleteTask={handleDeleteTask}
            bulkUpdateTasks={bulkUpdateTasks}
            sections={sections}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            updateTaskParentAndOrder={updateTaskParentAndOrder}
            reorderSections={reorderSections}
            allCategories={allCategories}
            setIsAddTaskOpen={() => {}}
            onOpenOverview={handleOpenTaskOverview}
            currentDate={currentDate}
            expandedSections={{}}
            expandedTasks={{}}
            toggleTask={() => {}}
            toggleSection={() => {}}
            toggleAllSections={() => {}}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
            markAllTasksInSectionCompleted={markAllTasksInSectionCompleted}
          />
        </CardContent>
      </Card>

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenTaskEdit}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}

      {taskToEdit && (
        <TaskDetailDialog
          task={taskToEdit}
          isOpen={!!taskToEdit}
          onClose={handleCloseTaskEdit}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          sections={sections}
          allCategories={allCategories}
          createSection={createSection}
          updateSection={updateSection}
          deleteSection={deleteSection}
          updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
          allTasks={processedTasks}
        />
      )}
    </div>
  );
};

export default Archive;