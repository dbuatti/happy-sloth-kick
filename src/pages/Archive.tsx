import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks, Task, NewTaskData } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskOverviewDialog from '@/components/TaskOverviewDialog';
import TaskFilter from '@/components/TaskFilter';
import { Archive as ArchiveIcon } from 'lucide-react';
import BulkActionBar from '@/components/BulkActionBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const [currentDate] = useState(new Date()); // currentDate is used by useTasks
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set()); // Fixed useState initialization
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);

  const taskListRef = useRef<any>(null);

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
    markAllTasksInSectionCompleted,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    expandedSections,
    expandedTasks,
    toggleTask,
    toggleSection,
    toggleAllSections,
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

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleNewTaskSubmit = useCallback(async (taskData: NewTaskData) => {
    const success = await handleAddTask(taskData);
    if (success) {
      // No specific dialog to close here, as quick add is not directly in Archive
    }
    return success;
  }, [handleAddTask]);

  const handleToggleSelectTask = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(taskId)) {
        newSelection.delete(taskId);
      } else {
        newSelection.add(taskId);
      }
      return newSelection;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkComplete = useCallback(async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'completed' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  }, [selectedTasks, bulkUpdateTasks]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ status: 'archived' }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  }, [selectedTasks, bulkUpdateTasks]);

  const handleBulkChangePriority = useCallback(async (priority: Task['priority']) => {
    if (selectedTasks.size > 0) {
      await bulkUpdateTasks({ priority }, Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  }, [selectedTasks, bulkUpdateTasks]);

  const handleBulkDeleteClick = useCallback(() => {
    setShowConfirmBulkDeleteDialog(true);
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    if (selectedTasks.size > 0) {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
      setShowConfirmBulkDeleteDialog(false);
    }
  }, [selectedTasks, bulkDeleteTasks]);

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <TaskFilter
            currentDate={currentDate}
            setCurrentDate={() => {}} // Not needed for archive view
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            sectionFilter={sectionFilter}
            setSectionFilter={setSectionFilter}
            sections={sections}
            allCategories={allCategories}
            searchRef={useRef<HTMLInputElement>(null)}
          />

          <div className="mt-4">
            <TaskList
              ref={taskListRef}
              processedTasks={processedTasks}
              filteredTasks={filteredTasks}
              loading={loading}
              handleAddTask={handleNewTaskSubmit}
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
              setIsAddTaskOpen={() => {}} // Not directly used in archive
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
          </div>
        </CardContent>
      </Card>

      {selectedTasks.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={handleClearSelection}
          onComplete={handleBulkComplete}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDeleteClick}
          onChangePriority={handleBulkChangePriority}
        />
      )}

      {taskToOverview && (
        <TaskOverviewDialog
          task={taskToOverview}
          isOpen={isTaskOverviewOpen}
          onClose={() => setIsTaskOverviewOpen(false)}
          onEditClick={handleOpenOverview}
          onUpdate={updateTask}
          onDelete={deleteTask}
          sections={sections}
          allTasks={processedTasks}
        />
      )}

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedTasks.size} selected tasks and all their sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;