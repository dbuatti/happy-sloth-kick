"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useTasks, Task, NewTaskData, TaskSection, Category } from '@/hooks/useTasks';
import TaskList from '@/components/TaskList';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Archive as ArchiveIcon, Undo2, Trash2 } from 'lucide-react'; // Removed unused ListRestart
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
import { useSound } from '@/context/SoundContext';
import { useAllAppointments } from '@/hooks/useAllAppointments';
import { Appointment } from '@/hooks/useAppointments';
import { useIsMobile } from '@/hooks/use-mobile'; // Added useIsMobile import
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // Added Sheet imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Added Dialog imports
import TaskForm from '@/components/TaskForm'; // Added TaskForm import
import { Skeleton } from '@/components/ui/skeleton'; // Added Skeleton import

interface ArchiveProps {
  isDemo?: boolean;
  demoUserId?: string;
}

const Archive: React.FC<ArchiveProps> = ({ isDemo = false, demoUserId }) => {
  const { user } = useAuth();
  const userId = demoUserId || user?.id;

  const [currentDate] = useState(new Date()); // Keep currentDate for useTasks hook
  const [isTaskOverviewOpen, setIsTaskOverviewOpen] = useState(false);
  const [taskToOverview, setTaskToOverview] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [showConfirmClearArchiveDialog, setShowConfirmClearArchiveDialog] = useState(false);
  const [showConfirmBulkDeleteDialog, setShowConfirmBulkDeleteDialog] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);

  const isMobile = useIsMobile(); // Initialized useIsMobile
  const { playSound } = useSound();

  const {
    processedTasks,
    filteredTasks,
    loading,
    handleAddTask,
    updateTask,
    // Removed unused deleteTask
    bulkUpdateTasks,
    bulkDeleteTasks,
    markAllTasksInSectionCompleted,
    sections,
    allCategories,
    createSection,
    updateSection,
    deleteSection,
    updateSectionIncludeInFocusMode,
    reorderSections,
    updateTaskParentAndOrder,
    setFocusTask,
    doTodayOffIds,
    toggleDoToday,
  } = useTasks({ currentDate, userId, viewMode: 'archive' });

  const { appointments: allAppointments } = useAllAppointments();

  const scheduledTasksMap = React.useMemo(() => {
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

  const handleEditTask = useCallback((task: Task) => {
    setTaskToEdit(task);
    setIsTaskDetailOpen(true);
  }, []);

  const handleNewTaskSubmit = async (taskData: NewTaskData) => {
    const success = await handleAddTask(taskData);
    if (success) {
      setIsTaskDetailOpen(false);
      playSound('success');
    }
    return success;
  };

  const handleRestoreAllArchived = async () => {
    if (isDemo) return;
    const archivedTaskIds = filteredTasks.filter(task => task.status === 'archived').map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkUpdateTasks({ status: 'to-do' }, archivedTaskIds);
      playSound('success');
    }
  };

  const handleClearArchiveClick = () => {
    setShowConfirmClearArchiveDialog(true);
  };

  const confirmClearArchive = async () => {
    if (isDemo) return;
    const archivedTaskIds = filteredTasks.filter(task => task.status === 'archived').map(task => task.id);
    if (archivedTaskIds.length > 0) {
      await bulkDeleteTasks(archivedTaskIds);
      playSound('alert');
    }
    setShowConfirmClearArchiveDialog(false);
  };

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasksToDelete([taskId]);
    setShowConfirmBulkDeleteDialog(true);
  }, []);

  const confirmDeleteTasks = async () => {
    if (isDemo) return;
    if (tasksToDelete.length > 0) {
      await bulkDeleteTasks(tasksToDelete);
      playSound('alert');
    }
    setShowConfirmBulkDeleteDialog(false);
    setTasksToDelete([]);
    setIsTaskOverviewOpen(false); // Close overview if a task was deleted from it
    setIsTaskDetailOpen(false); // Close detail if a task was deleted from it
  };

  const AddTaskDialogComponent = isMobile ? Sheet : Dialog;
  const AddTaskContentComponent = isMobile ? SheetContent : DialogContent;
  const AddTaskHeaderComponent = isMobile ? SheetHeader : DialogHeader;
  const AddTaskTitleComponent = isMobile ? SheetTitle : DialogTitle;
  const AddTaskDescriptionComponent = isMobile ? SheetDescription : DialogDescription;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-gradient-to-br from-[hsl(var(--gradient-start-light))] to-[hsl(var(--gradient-end-light))] dark:from-[hsl(var(--gradient-start-dark))] dark:to-[hsl(var(--gradient-end-dark))] rounded-b-2xl shadow-lg p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ArchiveIcon className="h-8 w-8 text-primary" /> Archived Tasks
          </h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRestoreAllArchived} disabled={isDemo || filteredTasks.length === 0}>
              <Undo2 className="mr-2 h-4 w-4" /> Restore All
            </Button>
            <Button variant="destructive" onClick={handleClearArchiveClick} disabled={isDemo || filteredTasks.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Archive
            </Button>
          </div>
        </div>
        <p className="text-lg text-muted-foreground">Tasks you've archived are stored here.</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 p-8 flex flex-col items-center gap-2">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Your archive is empty!</p>
            <p className="text-sm">No tasks have been archived yet. Keep up the great work!</p>
          </div>
        ) : (
          <TaskList
            processedTasks={processedTasks}
            filteredTasks={filteredTasks}
            loading={loading}
            handleAddTask={handleAddTask}
            updateTask={updateTask}
            deleteTask={handleDeleteTask} // Pass the local handleDeleteTask
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
            setIsAddTaskOpen={setIsTaskDetailOpen}
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
          />
        )}
      </main>

      <TaskOverviewDialog
        task={taskToOverview}
        isOpen={isTaskOverviewOpen}
        onClose={() => setIsTaskOverviewOpen(false)}
        onEditClick={handleEditTask}
        onUpdate={updateTask}
        onDelete={handleDeleteTask} // Pass the local handleDeleteTask
        sections={sections}
        allTasks={processedTasks}
      />

      <TaskDetailDialog
        task={taskToEdit}
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        onUpdate={updateTask}
        onDelete={handleDeleteTask} // Pass the local handleDeleteTask
        sections={sections}
        allCategories={allCategories}
        createSection={createSection}
        updateSection={updateSection}
        deleteSection={deleteSection}
        updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
        allTasks={processedTasks}
      />

      <AddTaskDialogComponent open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <AddTaskContentComponent className="sm:max-w-md">
          <AddTaskHeaderComponent>
            <AddTaskTitleComponent>{taskToEdit ? 'Edit Task' : 'Add New Task'}</AddTaskTitleComponent>
            <AddTaskDescriptionComponent className="sr-only">
              {taskToEdit ? 'Edit the details of your task.' : 'Fill in the details to add a new task.'}
            </AddTaskDescriptionComponent>
          </AddTaskHeaderComponent>
          <TaskForm
            initialData={taskToEdit}
            onSave={handleNewTaskSubmit}
            onCancel={() => setIsTaskDetailOpen(false)}
            sections={sections}
            allCategories={allCategories}
            currentDate={currentDate}
            createSection={createSection}
            updateSection={updateSection}
            deleteSection={deleteSection}
            updateSectionIncludeInFocusMode={updateSectionIncludeInFocusMode}
            allTasks={processedTasks}
          />
        </AddTaskContentComponent>
      </AddTaskDialogComponent>

      <AlertDialog open={showConfirmBulkDeleteDialog} onOpenChange={setShowConfirmBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected task(s) and all their sub-tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTasks}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Archive;