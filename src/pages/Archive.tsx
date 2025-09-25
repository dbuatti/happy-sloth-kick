"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive as ArchiveIcon, Trash2, Undo2, ListRestart } from 'lucide-react';
import { useTasks, Task } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import { useAuth } from '@/context/AuthContext';
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
import TaskFilter from '@/components/TaskFilter';
import TaskOverviewDialog from '@/components/TaskOverviewDialog'; // Imported TaskOverviewDialog
import { Appointment } from '@/hooks/useAppointments'; // Added Appointment import
import { useAllAppointments } from '@/hooks/useAllAppointments'; // Added useAllAppointments import

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date());
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);

  const {
    processedTasks,
    filteredTasks,
    loading,
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
    handleAddTask, // Needed for TaskList
    createSection, // Needed for TaskList
    updateSection, // Needed for TaskList
    deleteSection, // Needed for TaskList
    updateSectionIncludeInFocusMode, // Needed for TaskList
    setFocusTask, // Needed for TaskList
    doTodayOffIds, // Needed for TaskList
    toggleDoToday, // Needed for TaskList
  } = useTasks({ currentDate, userId: userId ?? undefined, viewMode: 'archive' });

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

  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);
  const [showConfirmRestoreAllDialog, setShowConfirmRestoreAllDialog] = useState(false);

  const archivedTasks = filteredTasks.filter(task => task.status === 'archived');

  const handleOpenOverview = useCallback((task: Task) => {
    setTaskToOverview(task);
    setIsTaskOverviewOpen(true);
  }, []);

  const handleEditTaskFromOverview = useCallback((task: Task) => {
    setIsTaskOverviewOpen(false);
    // If you have a separate edit dialog, open it here.
    console.log("Edit task from overview:", task.description);
  }, []);

  const handleRestoreAll = async () => {
    if (isDemo) return;
    const archivedTaskIds = archivedTasks.map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkUpdateTasks({ status: 'to-do' }, archivedTaskIds);
    }
    setShowConfirmRestoreAllDialog(false);
  };

  const handleBulkDelete = async () => {
    if (isDemo) return;
    const archivedTaskIds = archivedTasks.map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkDeleteTasks(archivedTaskIds);
    }
    setShowConfirmBulkDeleteDialog(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <Card className="w-full shadow-lg rounded-xl mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-primary" /> Archived Tasks
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tasks that are no longer active but kept for reference.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmRestoreAllDialog(true)}
                disabled={archivedTasks.length === 0 || isDemo}
                className="h-9"
              >
                <Undo2 className="mr-2 h-4 w-4" /> Restore All
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowConfirmBulkDeleteDialog(true)}
                disabled={archivedTasks.length === 0 || isDemo}
                className="h-9"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete All
              </Button>
            </div>
          </div>
          <TaskFilter
            currentDate={currentDate}
            setCurrentDate={() => {}} // Not relevant for archive, but required by prop
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
            searchRef={null}
          />
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 w-full bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : archivedTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Your archive is empty!</p>
            <p className="text-sm">No tasks have been archived yet. Keep up the good work!</p>
          </div>
        ) : (
          <TaskList
            processedTasks={processedTasks}
            filteredTasks={archivedTasks}
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
            expandedSections={{}} // All sections expanded by default in archive
            expandedTasks={{}} // All tasks expanded by default in archive
            toggleTask={() => {}}
            toggleSection={() => {}}
            toggleAllSections={() => {}}
            setFocusTask={setFocusTask}
            doTodayOffIds={doTodayOffIds}
            toggleDoToday={toggleDoToday}
            scheduledTasksMap={scheduledTasksMap}
            isDemo={isDemo}
          />
        )}
      </div>

      <AlertDialog open={showConfirmRestoreAllDialog} onOpenChange={setShowConfirmRestoreAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore All Archived Tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all {archivedTasks.length} archived tasks back to your "To Do" list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreAll}>Restore All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all {archivedTasks.length} archived tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        sections={sections}
        allCategories={allCategories}
        onEditClick={handleEditTaskFromOverview}
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